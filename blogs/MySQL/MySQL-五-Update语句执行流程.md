---
title: MySQL(五) Update语句执行流程
date: 2021-08-16 10:22:11
tags:
    - 数据库
    - MySQL
---

这篇文章演示环境为：MySQL5.7。

主要内容为基于[MySQL5.7官方文档](https://dev.mysql.com/doc/refman/5.7/en/)的学习，对MySQL update/insert/delete执行流程相关内容的整理及自己的理解。

如有错误或疑问，欢迎讨论！

<!-- more -->

![更新流程](https://img2020.cnblogs.com/blog/565213/202005/565213-20200530221711156-63363016.png)

**1. 查询**

与[Select语句执行流程](https://avriesl.github.io/2021/08/16/MySQL-%E4%BA%8C-Select%E8%AF%AD%E5%8F%A5%E6%89%A7%E8%A1%8C%E6%B5%81%E7%A8%8B/)
相同，先查询要更新的数据，并将其从磁盘文件加载到内存中的**Buffer Pool**中

**2. 写入undo log**

将已经加载到**Buffer Pool**数据，记录到undo log中，便于回滚时需要

**3. 修改**

修改已加载到**Buffer Pool**中的数据

**4. 记入redo log**

将更新语句记录到redo log buffer中，并刷新到磁盘中，标记为prepare状态

**5. 记入bin log（两阶段提交）**

若redo log buffer写盘成功，则记录更新语句到bin log中

若bin log写盘成功，则可提交事务，将redo log中对应记录标记为commit状态

**6. 刷脏**

两阶段提交完成后，更新语句便执行完成，但此时已修改的记录仍在**Buffer Pool**中，还未写入磁盘

此时InnoDB会通过刷脏的方式，将修改记录写入磁盘，已保证数据的一致性

> **刷脏**: 在InnoDB中存在一个专门的线程，负责每隔一段时间就一次性将多个修改写入磁盘
> 
> **脏页**: buffer pool中与磁盘数据页内容不一致的数据页
> 
> **干净页**: 刷脏后，buffer pool中与磁盘数据页内容一致的数据页

**刷脏的触发条件**:

1. 到达设定时间后，InnoDB会执行刷脏;

2. buffer pool满了，InnoDB会强制执行刷脏;

3. redo log满了，InnoDB会使更新操作拥塞;

4. MySQL关闭的时候。

> 修改数据未刷脏时，若用户查询数据，InnoDB会现在Buffer Pool中查询一遍，若有对应数据则返回结果集

