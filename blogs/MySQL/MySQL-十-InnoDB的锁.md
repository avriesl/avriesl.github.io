---
title: MySQL(十) InnoDB的锁
date: 2021-08-18 15:44:10
tags:
    - 数据库
    - MySQL
---
# 前言

这篇文章演示环境为：MySQL5.7。

主要内容为基于[MySQL5.7官方文档](https://dev.mysql.com/doc/refman/5.7/en/)的学习，对InnoDB锁相关内容的整理及自己的理解。

如有错误或疑问，欢迎讨论！

<!-- more -->

# InnoDB并发

回顾上一篇[MySQL(九) InnoDB事务特性](https://avriesl.github.io/2021/08/18/MySQL-%E4%B8%83-InnoDB%E4%BA%8B%E5%8A%A1%E7%89%B9%E6%80%A7/) 
中提到过事务具有四大特性**ACID**，原子性、一致性、隔离性和持久性。

当在数据库中，并发任务对同一份临界资源进行操作的时候，如果不对其采取措施，那么很可能导致数据不一致，违反了一致性原则。

那么，如何对并发该采取哪些措施呢？

常见措施有：

- 锁（Locking）
- 数据多版本（Multi-Versioning）

而本篇文章主要介绍锁。

# 锁

在InnoDB共有七种类型的锁：

1. 共享/排他锁（Shared and Exclusive Locks）
2. 意向锁（Intention Locks）
3. 记录锁（Record Locks）
4. 间隙锁（Gap Locks）
5. 临键锁（Next-Key Locks）
6. 插入意向锁（Insert Intention Locks）
7. 自增锁（AUTO-INC Locks）

> 其实还有个谓词锁，是InnoDB专门针对空间索引的，本文不讲，有兴趣的可以去官网查看[InnoDB Locking](https://dev.mysql.com/doc/refman/5.7/en/innodb-locking.html)

## 共享/排他锁（Shared and Exclusive Locks）

怎么使用锁来控制并发呢？

正常使用锁的步骤一般如下：

1. 操作数据前，锁住待操作记录；
2. 操作完成后，释放锁。

虽然这样确实保证了一致性，但是在多并发情况下，这样的执行过程本质上是串行了。

于是InnoDB提供了**共享锁**和**排他锁**：

- 共享锁（Share Locks）：记为S锁，在读取数据的时候记录行添加S锁；
- 排他锁（Exclusive Locks）：记为X锁，在修改数据的时候记录行添加X锁。

用法：

- 共享锁之间不互斥，即：读读可并行；
- 排他锁与任何锁互斥，即：写读、写写不可并行；

> 共享/排他锁存在一个潜在问题，那就是在写操作未执行完成的情况下，select操作仍会被阻塞。
> 这个问题的解决思路就是数据多版本控制（下一篇会对此详细讲解）。

## 意向锁（Intention Locks）

**意向锁**：在事务可能要加共享/排他锁前，先提前声明一个意向。

特点：

1. 表级锁
2. 意向锁分为：
    - 意向共享锁（Intention shared lock）：记为IS锁，代表事务有意对表中某些行加S锁；
    - 意向排他锁（Intention exclusive lock）：记为IX锁，代表事务有意对表中某些行加X锁。
3. 协议：
    - 事务要获取某些行的S锁，必须先获取表的IS锁；
    - 事务要获取某些行的X锁，必须先获取表的IX锁。
4. 意向锁之间并不互斥，可以并行。
5. 意向锁与共享/排他锁之间存在兼容互斥关系：
    - 共享锁（S锁）与意向共享锁（IS锁）之间不互斥；
    - 排他锁（X锁）与意向排他锁（IX锁）与其他锁互斥。

通过以上描述可能只是对**意向锁**的概念有所了解，具体作用可能还是有点懵。那么，接下来我们看个例子：

假设存在一个表user(userid PK, username, pwd)，表内记录如下：

```sql
mysql> select * from user;
+--------+----------+----------+
| userid | username | pwd      |
+--------+----------+----------+
|      1 | Laim     | 123      |
|      2 | avriesl  | 12345    |
|      3 | Laim     | illusion |
+--------+----------+----------+
```

首先，**事务A**执行SQL语句：update user set username = 'Laim123' where userid = 1;
**事务A**更新语句执行完成后，不提交事务。

```sql
-- 事务A
mysql> start transaction;
Query OK, 0 rows affected (0.00 sec)

mysql> update user set username = 'Laim123' where userid = 1;
Query OK, 1 row affected (0.00 sec)
Rows matched: 1  Changed: 1  Warnings: 0
```

随后，**事务B**执行SQL语句：select * from user where username = 'avriesl' for update;
**事务B**会被夯住。

```sql
-- 事务B
mysql> start transaction;
Query OK, 0 rows affected (0.00 sec)

mysql> select * from user where username = 'avriesl' for update;
ERROR 1205 (HY000): Lock wait timeout exceeded; try restarting transaction
```

我们来跟着上面例子的结果来分析一遍，

假如没有意向锁情况：

1. 事务A中在执行更新语句时，会为userid=1这行添加了一个**X锁**。
2. 事务B在执行select * from user where username = 'avriesl' for update时（username没有索引，select查询会查询全表），
事务B不知道表内是否有数据正在修改，于是开始逐步对表内行记录添加**S锁**，当加到userid=1这行时，发现该行记录存在**X锁**，于是互斥阻塞。

这样分析看着与上面例子的结果符合，但是思考一下，这种方式有没有什么问题？

1. 表内数据过多，查询全表时每行均需要添加**S锁**，会很浪费资源；
2. 若此时再来个事务，对全表扫描，那么又会对其他记录添加**S锁**。

所以在若没有意向锁，那么在高并发读写的情况下，数据库会因为频繁加锁、释放锁从而导致消耗大量资源

存在意向锁情况：

1. 事务A中在执行更新语句时，会现在user表上添加**IX锁**，再为userid=1这行添加了一个**X锁**。
2. 事务B在执行select * from user where username = 'avriesl' for update时，检查到user表上存在**IX锁**，因为**S锁**与**IX锁**互斥，于是阻塞。

这样就避免了在实现锁表的时候对表内所有记录添加行锁，从而浪费资源。

## 记录锁（Record Locks）

**记录锁**：记录锁的对象是索引记录。

例如：select * from user where id = 1 for update;

它会在id=1的索引上加锁，从而阻止其他事务来插入、更新、删除id=1这一行。

> InnoDB中，select * from user where id = 1是快照读，不加锁。

## 间隙锁（Gap Locks）

**间隙锁**：间隙锁的对象是索引记录的间隔，即索引叶子节点中的前驱与后继引用。

例如：select * from user where id between 2 and 4 for update;

它会在区间1,2、2,3、3,4、4,5进行加锁，从而防止其他事务在间隔中插入数据。

## 临键锁（Next-Key Locks）

**临键锁**：临键锁即是**记录锁与间隙锁的组合**，同时对索引记录、索引区间进行了加锁处理。

临键锁主要作用就是用来解决当前读的幻读问题。

## 插入意向锁（Insert Intention Locks）

**插入意向锁**：插入意向锁是间隙锁的一种，实际上也是在索引上操作的。

它的作用是：多个事物在同一索引、同一范围插入记录时，如果插入位置不冲突，则不会发生阻塞。

例如：

在执行insert into user(3, 'Laim', '123')语句时，会在2,3、3,4这两个区间进行加锁。
若此时另一个事务也在插入数据，只要它插入的数据不是2,3、3,4这两个区间，就不会发生互斥。

## 自增锁（AUTO-INC Locks）

**自增锁**：自增锁是一种特殊的表级锁，专门针对事务插入AUTO_INCREMENT类型的列。当有事务正在插入AUTO_INCREMENT列时，其他事务的插入必须等待。

> 本文中提到的快照读、当前读，在下一篇文章中会详细讲解[MySQL(十一) Innodb多版本并发控制-MVCC]()