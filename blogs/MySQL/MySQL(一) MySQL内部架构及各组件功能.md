---
title: MySQL(一) MySQL内部架构及各组件功能
date: 2021-08-16 09:14:06
tags:
    - 数据库
    - MySQL
---

# 前言

这篇文章演示环境为：MySQL5.7。

主要内容为基于[MySQL5.7官方文档](https://dev.mysql.com/doc/refman/5.7/en/)的学习，对MySQL整体架构及内部模块相关内容的整理及自己的理解。

如有错误或疑问，欢迎讨论！

<!-- more -->

# 整体架构

## 物理架构

![MySQL的物理架构](https://lalitvc.files.wordpress.com/2016/11/mysql_physical_arch2.png)

### MySQL二进制文件目录（Base Directory）

#### 程序日志文件（Program log files）

- 依赖（Libraries）
- 文档，支撑文件（Documents, support files）
- PID文件（pid files）
- Socket文件（socket files）

#### 程序可执行文件（Program executable files）

主要为MySQL启动、备份等功能的可执行文件。例如：

- mysql（客户端程序）
- mysqld（服务端程序）
- mysqladmin（管理程序）
- mysqldump（备份程序）
- ... ...

### MySQL数据文件目录（Data Directory）

MySQL不同存储引擎、不同版本下都有属于自己的数据文件格式，以下数据文件格式仅代表MySQL 5.7默认存储引擎（Innodb）情况。

#### 数据文件目录（Data Directory）

- 服务端日志文件（Server log files）
- 数据库状态文件（Status file）
- Innodb日志文件（Innodb log files）
- Innodb系统表空间（Innodb system tablespace）
- Innodb日志缓存（Innodb log buffer）
- ... ...

#### 数据文件子目录（Data sub-directory）

- 数据索引文件（.ibd）
- 数据结构文件（.frm, .opt）

## 逻辑架构

![MySQL的逻辑架构](https://lalitvc.files.wordpress.com/2016/11/mysql_logical_arch1.png)

### 客户端（Client）

用于连接MySQL服务器的各种应用程序，例如：

- ODBC
- JDBC
- .NET
- PHP
- ... ...

### 服务端（Server）

MySQL实例，用于进行数据处理及数据存储。

#### 连接器（Connections）

MySQL默认监听端口为3306。

##### 通信协议

MySQL支持多种通信协议。

1. TCP/IP协议

例如：JDBC、ODBC等数据库驱动产生的连接，这种连接被称为**非交互式连接**。

2. Unix Socket

例如：在服务器上运行*mysql -u root -p*登录服务器产生的连接，连接需要*mysql.sock*文件，这种连接被称为**交互式连接**。

> 交互式连接：
>
> 在mysql_real_connect()中使用CLIENT_INTERACTIVE选项的客户端产生的连接就是交互式连接，例如通过命令登录MySQL进行操作，当你停止操作时间超过参数interactive_timeout后，MySQL就会断开连接；
>
> 非交互式连接：
>
> 在mysql_real_connect()中使用wait_timeout选项的客户端产生的连接就是非交互式连接，例如通过JDBC等方式产生的连接，当非交互式连接获取的线程不活跃时长草果wait_timeout（默认8小时）后，MySQL就会清除掉该连接线程。

##### 通信方式

MySQL使用半双工的通信方式。

半双工意味着要么客户端向服务端发送数据，要么服务端向客户端发送数据，这两个动作不能同时发生。

所以在一次连接里面，客户端发送SQL语句到服务端时，数据是不能分成多个小块发送的，不管SQL语句有多大，都是一次性发送。

如果发送给数据包过大，我们必须要调整MySQL服务端配置*max_allowed_packet*参数的值（默认4M，最大1G，最小1K）。

![max_allowed_packet](https://avriesl.github.io/images/mysql/max_allowed_packet.png)

```sql
# 可以通过如下命令查看
mysql> show variables like 'max_allowed_packet';
+--------------------+-------------+ 
| Variable_name      | Value       |
+--------------------+-------------+ 
| max_allowed_packet | 1073741824  | 
+--------------------+-------------+
```

##### 连接方式

MySQL即支持短连接，也支持长连接。

短连接即连接中若超过一定时间未进行任何操作，则close连接，可通过更改*interactive_timeout*参数的值进行调整（默认8小时，最小1s）。

![interactive_timeout](https://avriesl.github.io/images/mysql/interactive_timeout.png)

```sql
# 可以通过如下命令查看(交互式连接超时时间)
mysql> show global variables like 'interactive_timeout';
+---------------------+-------+ 
| Variable_name       | Value |
+---------------------+-------+ 
| interactive_timeout | 7200  | 
+---------------------+-------+
```

长连接即连接在一定时间内均处于非活跃连接，则kill该连接，可通过更改*wait_timeout*参数的值进行调整（默认8小时，最小1s，windows系统最大25天左右，其他系统最大1年）

![wait_timeout](https://avriesl.github.io/images/mysql/wait_timeout.png)

```sql
# 可以通过如下命令查看(非交互式连接超时时间)
mysql> show global variables like 'wait_timeout';
+---------------+--------+ 
| Variable_name | Value  |
+---------------+--------+ 
| wait_timeout  | 86400  | 
+---------------+--------+
```

MySQL默认连接数为151个（5.7版本），最大100000个

![max_connections](https://avriesl.github.io/images/mysql/max_connections.png)

```sql
# 可以通过如下命令查看
mysql> show variables like 'max_connections';
+------------------+-------+ 
| Variable_name    | Value |
+------------------+-------+ 
| max_connections  | 2532  | 
+------------------+-------+
```

可以通过如下命令查看查询的执行状态

```sql
mysql> show full processlist;
+----+------+-----------------+----+---------+---------+-------+------+
| id | user | host            | db | command | time    | state | info |
+----+------+-----------------+----+---------+---------+-------+------+
| 69 | root | 127.0.0.1:48786 |    | Sleep   | 53      |       |      |
+----+------+-----------------+----+---------+---------+-------+------+
```

其中state可详见[MySQL :: MySQL 5.7 Reference Manual :: 8.14.3 General Thread States](https://dev.mysql.com/doc/refman/5.7/en/general-thread-states.html)

#### 查询缓存（Query Cache）

可通过*have_query_cache*参数查看服务器查询缓存是否可用

> 从 MySQL 5.7.20 开始不推荐使用查询缓存，并在 MySQL 8.0 中删除。

```sql
mysql> show variables like 'have_query_cache'; 
+------------------+-------+ 
| Variable_name    | Value |
+------------------+-------+ 
| have_query_cache | YES   | 
+------------------+-------+
```

可通过*query_cache_type*参数查看服务器是否开启查询缓存

```sql
mysql> show variables like 'query_cache_type'; 
+------------------+-------+ 
| Variable_name    | Value |
+------------------+-------+ 
| query_cache_type | OFF   | 
+------------------+-------+
```

Query Cache是MySQL内部自带的一个缓存模块，默认是关闭的，主要是因为Query Cache的应用场景有限

1. Query Cache要求SQL语句必须一模一样；
2. 表中任何一条数据发生变化时，Query Cache中所有关于这张表的缓存均会失效。

#### 解析器（parser）

MySQL解析器会对SQL语句进行词法、语法进行分析。

##### 词法解析

MySQL会将一个完整的SQL语句进行打散为一个一个的单词

例如：select id from user where id > 1 and age = 15;

MySQL会将这个SQL语句打散为select、id、from、user、where、id、>、1、and、=、15这11个符号，并记录每个符号是什么类型，符号间顺序。

##### 语法解析

MySQL会对SQL做一些语法检查，然后基于MySQL定义的语法规则，根据SQL语句生成一个数据结构（**解析树**）

![select](https://avriesl.github.io/images/mysql/select.png)

#### 预处理器（prepared）

主要用于语义解析，检查生成的**解析树**中是否存在表名错误、字段名错误、别名错误等，并生成**新的解析树**

#### 优化器（optimizer）

优化**解析树**，并根据**解析树**生成不同的**执行计划**，然后选择一种最优的执行计划，在MySQL中使用的是一种基于开销（cost）的优化器，所以在MySQL 优化器中，使用的就是开销最小执行计划。

> 优化类型：
>
> 1.多表关联查询时，选择基准表
>
> 2.where条件中存在恒等式或恒不等式，移除该条件
>
> 3.查询数据时，判断是否使用索引
>
> 4.count()、max()、min()等方法时，判断是否能直接从索引中获取
>
> 5.其他
>
> 注意：开销最小 ≠ 时间最短

```sql
mysql> show status like 'Last_query_cost';
+------------------+-------------+ 
| Variable_name    | Value       |
+------------------+-------------+ 
| Last_query_cost  | 12.499000   | 
+------------------+-------------+
```

> **优化器的追踪**
>
> [MySQL :: MySQL Internals Manual :: 8 Tracing the Optimizer](https://dev.mysql.com/doc/internals/en/optimizer-tracing.html)
>
> 启用优化器的追踪功能（默认是关闭的）
>
> ```sql
> mysql> show variables like 'optimizer_trace';
> +------------------+----------------------------+ 
> | Variable_name    | Value                      |
> +------------------+----------------------------+ 
> | optimizer_trace  | enabled=off,one_line=off   | 
> +------------------+----------------------------+
> mysql> set optimizer_trace="enabled=on";
> mysql> show variables like 'optimizer_trace';
> +------------------+----------------------------+ 
> | Variable_name    | Value                      |
> +------------------+----------------------------+ 
> | optimizer_trace  | enabled=on,one_line=off    | 
> +------------------+----------------------------+
> ```
>
> 注意：开启这个功能会消耗性能
>
> 随后执行一条SQL语句
>
> ```sql
> mysql> select * from `user` where id = 1;
> +----+----------+-----+
> | id | username | pwd |
> +----+----------+-----+
> | 1  | Laim     | 123 |
> +----+----------+-----+
> ```
>
> 这个时候优化器分析过程已经记录到系统表中了
>
> ```sql
> mysql> select * from information_schema.optimizer_trace;
> # 显示结果太长，此处省略
> ```
>
> 最后记得关闭追踪功能

#### 存储引擎

[MySQL :: MySQL 5.7 Reference Manual :: 15 Alternative Storage Engines](https://dev.mysql.com/doc/refman/5.7/en/storage-engines.html)

当优化器生成最优**执行计划**后，执行器会将执行计划交给存储引擎，存储引擎会通过执行计划在实际数据文件内查询数据。

在MySQL中，支持多种存储引擎，可以通过show engines语句查询你的服务器支持哪些存储引擎。

```sql
mysql> show engines;
+--------------------+---------+-----------------+--------------+-----+------------+
| Engine             | Support | Comment         | Transactions | XA  | Savepoints |
+--------------------+---------+-----------------+--------------+-----+------------+
| PERFORMANCE_SCHEMA | YES     | Performance ... | NO           | NO  | NO         |
+--------------------+---------+-----------------+--------------+-----+------------+
| MRG_MYISAM         | YES     | Collection of...| NO           | NO  | NO         |
+--------------------+---------+-----------------+--------------+-----+------------+
| MyISAM             | YES     | MyISAM stora... | NO           | NO  | NO         |
+--------------------+---------+-----------------+--------------+-----+------------+
| BLACKHOLE          | YES     | /dev/null st... | NO           | NO  | NO         |
+--------------------+---------+-----------------+--------------+-----+------------+
| InnoDB             | DEFAULT | Supports tra... | YES          | YES | YES        |
+--------------------+---------+-----------------+--------------+-----+------------+
| MEMORY             | YES     | Hash based ...  | NO           | NO  | NO         |
+--------------------+---------+-----------------+--------------+-----+------------+
| ARCHIVE            | YES     | Archive stor... | NO           | NO  | NO         |
+--------------------+---------+-----------------+--------------+-----+------------+
| CSV                | YES     | CSV storage...  | NO           | NO  | NO         |
+--------------------+---------+-----------------+--------------+-----+------------+
| FEDERATED          | NO      | Federated My... |              |     |            |
+--------------------+---------+-----------------+--------------+-----+------------+
```