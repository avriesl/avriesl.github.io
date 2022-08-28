---
title: MySQL(九) InnoDB事务特性
date: 2021-08-18 14:35:40
tags:
    - 数据库
    - MySQL
---

# 前言

这篇文章演示环境为：MySQL5.7。

主要内容为基于[MySQL5.7官方文档](https://dev.mysql.com/doc/refman/5.7/en/)的学习，对MySQL事务特性相关内容的整理及自己的理解。

如有错误或疑问，欢迎讨论！

<!-- more -->

MySQL5.5版本以后，默认存储引擎从MyISAM更改为了InnoDB，下文针对事务的讲解均是基于InnoDB存储引擎。

> MySQL5.5版本以前，默认存储引擎为MyISAM，该存储引擎不支持事务，对于表的并发操作，是通过锁来处理的。

# 事务

**事务**：数据库的最小工作单元，事务是一组不可分隔的操作集合。

举个例子：转账

张三向李四转账1000元，这个操作是不可分隔的，是一个最基本的单元。
要么张三扣了1000元，李四加上1000元；要么张三不扣1000元，李四不加1000元。

```sql
update user_account set money = money - 1000 where name = "张三";
update user_account set money = money + 1000 where name = "李四";
```

MySQL 开启事务：

```sql
BEGIN/START TRANSACTION ;   --手动开启事务
COMMIT/ROLLBACK ;           --提交/回滚事务
SET SESSION autocommit = ON/OFF --设定会话级别事务是否自动开启
```

MySQL默认是开启事务的，可以通过如下命令查看：

```sql
mysql> show variables like 'autocommit';
+---------------+-------+
| Variable_name | Value |
+---------------+-------+
| autocommit    | ON    |
+---------------+-------+
```

- 在*autocommit=ON*（自动提交事务）的情况下，可以执行*begin transaction*或者*start transaction*来改变为手动提交事务，在执行完sql操作后，需要手动执行*commit*或者*rollback*来手动提交或者回滚。
- 在*autocommit=OFF*（手动提交事务）的情况下，执行完sql操作后，需手动执行*commit*或者*rollback*来手动提交或者回滚。

# 事务的四大特性：ACID

事务具有4个特征，分别是原子性、一致性、隔离性和持久性，简称事务的ACID特性。

## 原子性（atomicity）

一个事务要么全部提交成功，要么全部失败回滚，不能只执行其中的一部分操作。

一个事务要么全部提交成功，要么全部失败回滚，成功或失败取决于我们最后是commit还是rollback，而不是事务中有执行错误的语句，事务便会回滚。

## 一致性（consistency）

事务的执行不能破坏数据库数据的完整性和一致性，一个事务在执行之前和执行之后，数据库都必须处于一致性状态。

如果数据库系统在运行过程中发生故障，有些事务尚未完成就被迫中断，这些未完成的事务对数据库所作的修改有一部分已写入物理数据库，这是数据库就处于一种不正确的状态，也就是不一致的状态

> 那MYSQL怎么实现一致性的呢？
> 
> MySql通过实现AID(原子性、隔离性、持久性)来实现一致性，可以理解为AID只是手段，而一致性是目的。

## 隔离性（isolation）

多个事务并发执行的情况下，系统保障事务并发执行的结果，与串行执行的结果一致。

## 持久性（durability）

一旦事务提交，那么它对数据库中的对应数据的状态的变更就会永久保存到数据库中。

> 一致性与原子性的区别
> 
> 一致性强调的是数据库的整体状态，一个事务执行后，数据库要么是执行后的最终状态，要么是执行前的状态。
>
> 而原子性强调的是事务执行操作的完整性，一个事务执行时要么全执行，要么全不执行。

# 事务并发带来的问题

加上存在一个表user_innodb，表内数据如下：

[gitee innodb 1](https://avriesl.gitee.io/img/image-20200906174431828.png)

## 脏读

比如user表中有一条用户数据，执行了如下操作：

```sql
-- A、B窗口
-- 开启事务
start transaction;
-- 查看user表数据
select * from user;

-- A窗口
-- 更新user表数据
update user set pwd="123456" where username="Laim";
-- 查看user表数据，数据发生了改变
select * from user;

-- B窗口
-- 查看user表数据，发现数据也发生了改变
select * from user;
```

**A窗口**

[脏读 a](https://avriesl.gitee.io/img/image-20200906175215222.png)

**B窗口**

[脏读 b](https://avriesl.gitee.io/img/image-20200906175228593.png)

结果发现窗口B中Laim对应的pwd变为了123456，但窗口A并未提交事务。

现象为未提交事务A对事务B产生了影响，导致**事务B读取到了事务A未提交的操作记录**，这就是**脏读**。

## 不可重复读

```sql
-- A、B窗口
-- 开启事务
start transaction;
-- 查看user表数据
select * from user;

-- A窗口
-- 更新user表数据
update user set pwd="123456" where username="Laim";
-- 查看user表数据，数据发生了改变
select * from user;
-- 提交事务
commit;

-- B窗口
-- 查看user表数据，发现数据也发生了改变
select * from user;
```

**A窗口**

[不可重复度 a](https://avriesl.gitee.io/img/image-20200906180744466.png)

**B窗口**

[不可重复读 b](https://avriesl.gitee.io/img/image-20200906180814559.png)

结果发现在窗口A提交事务后，窗口B中Laim对应的pwd变为了123456。

现象为已提交事务A对事务B产生了影响，导致在**同一个事务内的相同查询，得到了不同结果**，这就是**不可重复读**

## 幻读

```sql
-- A、B窗口
-- 开启事务
start transaction;
-- 查看user表数据
select * from user;

-- A窗口
-- 插入一条数据
insert into user values (3,"Laim","illusion");
-- 查看user表数据，数据已经发生了改变
select * from user;
-- 提交事务
commit;

-- B窗口，查询的数据条数发生了改变
select * from user;
```

**窗口A**

![img.png](https://avriesl.github.io/images/mysql/huandu_a.png)

**窗口B**

![img_1.png](https://avriesl.github.io/images/mysql/huandu_b.png)

结果发现在窗口A提交事务后，窗口B中查询时结果增加了一条。

现象为已提交事务A对事务B产生了影响，导致**事务B的查询结果条数发生了变化**，这就是**幻读**

# 事务的隔离级别

[事务的隔离级别](https://avriesl.gitee.io/img/1646034-20190430095830286-1397235000.png)

1. 读未提交（Read Uncommitted）

所有事务都可以查询到其他未提交事务的执行结果。

事务间相互均可见。

**实现策略**

select语句不加锁，导致事务操作记录时，其他事务可能读取到不一致的数据。

**未解决任何并发问题**

这是MySQL并发最高的隔离级别，但是一致性却是最差的。

2. 读提交（Read Committed）

事务只能看见已经提交事务所做的改变。

提交后的事务操作可见。

**实现策略**

1. 普通读是快照读
2. 加锁的select、update、delete等语句，除了在外键约束检查以及重复键检查时会封锁区间，其他时候只使用记录锁。

**解决了脏读问题**

当其他事务插入或修改时，仍可能出现**不可重复读**与**幻读**。

3. 可重复读（Repeatable Read）

MySQL的默认事务隔离级别，确保同一事务的多个实例在并发读取数据时，会看到同样的数据行。

**实现策略**

1. 普通的select使用快照读，这是一种不加锁的一致性读
2. 加锁的select（select ... in share mode/select ... for update）、update、delete等语句，它们的锁依赖于以下几点：
    - 在唯一索引上使用了唯一查询条件：会使用记录锁，而不会使用间隙锁与临键锁
    - 范围查询：会使用间隙锁与临键锁

> 关于第二点，举个例子解释一下：
> 
> 第一种情况，即在唯一索引上使用了唯一查询条件，
> 例如存在一个表user(id PK, name)，
> 字段id是主键索引（主键索引就是一种特殊的唯一索引），其索引的离散度一定为1（即没有重复值）
> 若我们执行SQL语句：select id, name from user where id = 1 for update;
> 在RR隔离级别下，InnoDB会在id=1对应的行记录上，添加一把记录锁，
> 由于我们操作的行记录仅有id=1这一行，不会发生幻读，所以仅添加记录锁，防止脏读与不可重复读，无需再使用间隙锁与临键锁。
> 
> 第二种情况，即范围查询，
> 同样，例如存在一个表user(id PK, name)，字段id是主键索引
> 若我们执行SQL语句：select id, name from user where id < 3 for update;
> 在RR隔离级别下，InnoDB会在区间-infinity, 1、1, 2、2, 3这几个区间添加临键锁，以防止不可重复读与幻读。 

**解决了不可重复读问题**

4. 串行化（Serializable）

最高的隔离级别，它通过强制事务排序，使之不可能相互冲突。

**实现策略**

所有select语句均会被隐式转换为select ... in share mode;

这会导致所有读取未提交事务正在操作的行的select都会被堵塞。

**解决了幻读问题**

这是一致性最好的隔离级别，但却是并发性最差的。

> 关于本文中提到的锁，可查看下一篇文章[MySQL(十) InnoDB的锁](https://avriesl.github.io/2021/08/18/MySQL-%E5%8D%81-InnoDB%E7%9A%84%E9%94%81/)

