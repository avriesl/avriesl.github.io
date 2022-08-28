---
title: MySQL(十一) Innodb多版本并发控制-MVCC
date: 2021-08-19 14:55:35
tags:
    - 数据库
    - MySQL
---

# 前言

这篇文章演示环境为：MySQL5.7。

主要内容为基于[MySQL5.7官方文档](https://dev.mysql.com/doc/refman/5.7/en/)的学习，对InnoDB MVCC相关内容的整理及自己的理解。

如有错误或疑问，欢迎讨论！

<!-- more -->

在上文[MySQL(十) InnoDB的锁](https://avriesl.github.io/2021/08/18/MySQL-%E5%8D%81-InnoDB%E7%9A%84%E9%94%81/) 这一篇中 ，
我们提到使用锁来解决InnoDB的并发问题是有用的，但是仍然存在一个问题。

那就是不够高效，在InnoDB执行写操作的时候，仍会存在堵塞。

在MySQL中InnoDB通过数据多版本并发控制（MVCC）来解决了这个问题，这就是我们今天的主题。

# 定义

多版本并发控制（Multi-version concurrency control）：并发读写数据库时，对事务内正在操作的数据做多版本管理。从而避免写操作造成select堵塞。

MVCC是怎么避免写操作造成堵塞？

核心原理如下：

1. 写任务发生时，将数据克隆一份，以版本号区分；
2. 写任务操作的数据为新克隆的数据，直到任务提交；
3. 并发读任务可以继续读取旧数据，不会造成堵塞。

从而解决了InnoDB写读并发的问题。

下面我们来具体看一下，InnoDB中具体是怎么实现的。

# 实现

InnoDB MVCC主要通过3个隐式字段、undo日志、Read View来实现的，下面我们逐个了解一下：

## 隐式字段

从官方文档[InnoDB Multi-Versioning](https://dev.mysql.com/doc/refman/5.7/en/innodb-multi-versioning.html) 中我们可以了解到，
在MySQL内部，InnoDB在每一行记录中添加了三个字段：

- DB_TRX_ID：6字节，该字段记录了最后一次insert、update该行的事务标记符（可以理解成事务id）
- DB_ROLL_PTR：7字节，也叫回滚指针，该字段指向写入回滚段的undo log记录（也就是指向了该行的上个版本）
- DB_ROW_ID：6字节，该字段在讲解索引那个篇章提到过，为InnoDB的隐含字段，记录了行id，在没有主键且没有合适的唯一索引时，作为聚集索引

实际上还有一个delete的隐藏字段，用作记录该字段被删除。

## undo log

在[MySQL(三) MySQL日志文件](https://avriesl.github.io/2021/08/16/MySQL-%E4%B8%89-MySQL%E6%97%A5%E5%BF%97%E6%96%87%E4%BB%B6/) 中，
曾提到过undo log，没有详细讲解。

undo log主要分为两种：

- insert undo log：仅在事务回滚时需要，并且可以在事务提交后立即丢弃。
- update undo log：用于一致性读取，但只有在不存在InnoDB为其分配快照的事务时，对应日志才会被purge线程统一清理。

## Read View

事务进行快照读操作的时候产生的读视图（Read View），在事务执行快照读的那一刻，会生成数据库当前的一个快照，记录并维护系统中当前活跃事务的id。

Read View的主要作用是用作可见性判断，当我们创建一个事务执行快照读的时候，同时也生成了一个Read View，它记录了当前事务在执行快照读那一刻的数据库数据。
这个数据可能是最新的，也可能是一个历史版本。

而我们创建的事务持有这个读视图（Read View），所以当前事务

# 快照读

SQL读取的数据是历史版本（快照版本）

InnoDB为了提高并发效率，将数据的读取

# 当前读

SQL读取的数据是最新版本
