---
title: MySQL(三) MySQL日志文件
date: 2021-08-16 10:20:15
tags:
    - 数据库
    - MySQL
---

# 前言

这篇文章演示环境为：MySQL5.7。

主要内容为基于[MySQL5.7官方文档](https://dev.mysql.com/doc/refman/5.7/en/)的学习，对MySQL日志相关内容的整理及自己的理解。

如有错误或疑问，欢迎讨论！

<!-- more -->

MySQL中共有六种日志文件，分别为：

- 错误日志（error log）：记录启动、运行、停止mysql服务时遇到的错误。
- 一般查询日志（general query log）：记录已建立的客户端连接和从客户端收到的语句。
- 二进制日志（binary log）：记录更改数据的语句。
- 中继日志（relay log）：记录从复制源服务器处收到的数据更改语句。
- 慢查询日志（slow query log）：记录执行时间超过参数*long_query_time*的查询语句。
- DDL日志（ddl log）：记录DDL语句执行的元数据操作。

以上六种属于MySQL服务端日志，但MySQL产生的日志并非仅有上述几种

MySQL5.7中，InnoDB存储引擎支持事务，所以InnoDB也会产生相应的事务日志：重做日志（redo log）、回滚日志（undo log）。

# MySQL服务端日志

## 错误日志（error log）

*mysqld*可通过使用--log-error确定将错误日志写入控制台还是文件

若没有使用--log-error，则将错误日志写入控制台

若使用--log-error，但未指定文件名，则将错误日志写入host_name.err

若使用--log-error且指定文件名，则吸入指定文件

```sql
mysql> show variables like 'log_error';
+--------------------+-------------+ 
| Variable_name      | Value       |
+--------------------+-------------+ 
| log_error          |             | 
+--------------------+-------------+
```

## 一般查询日志（general query log）

一般查询日志是对*mysqld*正在做什么进行记录，当客户端连接或断开连接时，服务器将信息写入日志，并记录从客户端收到的每个sql语句。

当怀疑客户端存在错误或查询客户端发送给mysql的内容时，可以查询一般查询日志。

可通过如下命令查看*general query log*位置

```sql
mysql> show variables like 'general_log_file';
+--------------------+-------------+ 
| Variable_name      | Value       |
+--------------------+-------------+ 
| general_log_file   |             | 
+--------------------+-------------+
```

## 二进制日志（binary log）

[MySQL :: MySQL 5.7 Reference Manual :: 5.4.4 The Binary Log](https://dev.mysql.com/doc/refman/5.7/en/binary-log.html)

二进制日志（binary log）也就是常说的binlog

**binlog以事件的形式记录了描述数据库更改的所有DML/DDL语句**，binlog还包含了有关每个语句花费多长时间更新数据的信息。

binlog主要有两个作用：

1. 用于实现复制：复制源服务器将binlog发送给副本服务器，副本服务器将这些事件再次执行一遍，以完成与源相同的数据更改。
2. 用于数据恢复：读取原数据库中binlog，开启线程复现binlog中记录的更新操作，从而完成数据恢复。

## 中继日志（relay log）

中继日志与binlog一样，是一组包含描述数据库更改时间的编号文件。

中继日志与binlog具有相同的格式，可以通过*mysqlbinlog*命令读取

一般与binlog配合使用，从而实现复制

## 慢查询日志（slow query log）

慢查询日志记录了执行时间超过参数*long_query_time*的查询语句。

主要用于优化，可通过如下命令查看日志路径：

```sql
mysql> show variables like 'slow_query_log_file';
+-----------------------+-------------+ 
| Variable_name         | Value       |
+-----------------------+-------------+ 
| slow_query_log_file   |             | 
+-----------------------+-------------+
```

## DDL日志（ddl log）

DDL日志负责记录由影响表分区的数据定义而生成的元数据操作，是一个二进制文件。

# InnoDB日志

## 重做日志（redo log）

[MySQL :: MySQL 5.7 Reference Manual :: 14.6.6 Redo Log](https://dev.mysql.com/doc/refman/5.7/en/innodb-redo-log.html)

redo log是一种基于磁盘的数据结构，用于在数据库崩溃期间纠正不完整事务写入的数据，以实现数据一致性

正常操作期间，redo log会对由sql语句或低级API调用产生的请求进行编码

在初始化期间和接受连接前，自动重放在意外关闭前未完成更新数据文件的修改

默认情况下，InnoDB在数据目录中创建两个5MB的重做日志文件，命名为ib_logfile0和ib_logfile1

可在mysql配置文件中对其修改：

```
[mysqld]
innodb_log_group_home_dir=/dr3/iblogs
```

可通过以下步骤实现修改redo log大小

1. 停止MySQL服务，并保证关闭没有错误；
2. 编辑my.cnf以更改日志文件配置。要更改日志文件大小，需配置innodb_log_file_size；
3. 再次启动MySQL服务。

### redo log的优化

为了减少不必要的磁盘写入，可以考虑在以下几个方面对redo log进行优化：

1. 加大redo log大小，甚至可以加到和buffer pool一样大。这样会减少不必要的磁盘写入，但会导致更长的恢复时间。
2. 增加日志缓冲区的大小，可通过innodb_log_buffer_size进行配置。
3. 配置innodb_log_write_ahead_size选项来避免"读写"。

## 回滚日志（undo log）

[MySQL :: MySQL 5.7 Reference Manual :: 14.6.7 Undo Logs](https://dev.mysql.com/doc/refman/5.7/en/innodb-undo-logs.html)

undo log是由单个事务读写相关联的撤销日志记录的集合构成。主要用于事务的回滚，详细可看InnoDB多版本管理（MVCC）描述。