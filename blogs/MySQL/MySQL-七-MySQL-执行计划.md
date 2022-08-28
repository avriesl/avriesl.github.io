---
title: MySQL(七) MySQL 执行计划
date: 2021-08-19 09:17:17
tags:
    - 数据库
    - MySQL
---

# 前言

这篇文章演示环境为：MySQL5.7。

主要内容为基于[MySQL5.7官方文档](https://dev.mysql.com/doc/refman/5.7/en/)的学习，对MySQL执行计划相关内容的整理及自己的理解。

如有错误或疑问，欢迎讨论！

<!-- more -->

**EXPLAIN查看的是执行计划，用做SQL解析，不会真的去执行。**

# EXPLAIN的使用

```sql
mysql> explain select userid, username, pwd from user where userid = 1\G;
*************************** 1. row ***************************
id: 1                                   -- 执行计划的id
select_type: SIMPLE                     -- select的类型
table: user                             -- 输出记录的表
partitions: NULL                        -- 匹配的分区
type: ALL                               -- join的类型
possible_keys: NULL                     -- 优化器可能选择的索引
key: NULL                               -- 优化器实际选择的索引
key_len: NULL                           -- 使用索引的字节长度
ref: NULL                               -- 进行比较的索引列
rows: 3                                 -- 优化器预估查询的记录数量
filtered: 33.33                         -- 根据条件过滤得到的记录占中路的百分比
Extra: Using where                      -- 额外信息
1 row in set, 1 warning (0.00 sec)

mysql> show warnings\G;
*************************** 1. row ***************************
  Level: Note
   Code: 1003
Message: /* select#1 */ select `testzc`.`user`.`userid` AS `userid`,`testzc`.`user`.`username` AS `username`,`testzc`.`user`.`pwd` AS `pwd` from `testzc`.`user` where (`testzc`.`user`.`userid` = 1)
    1 row in set (0.00 sec)
```

## EXTENDED参数

功能：启用扩展输出。

现在默认启用扩展输出，EXTENDED参数即将被弃用，在执行EXPLAIN时可以不使用该参数。

## FORMAT参数

功能：格式化EXPLAIN的输出结果。

```sql
mysql> explain format=json select userid, username, pwd from user where userid = 1\G;
*************************** 1. row ***************************
EXPLAIN: {
    "query_block": {
        "select_id": 1,
        "cost_info": {
            "query_cost": "1.60"
        },
        "table": {
            "table_name": "user",
            "access_type": "ALL",
            "rows_examined_per_scan": 3,
            "rows_produced_per_join": 1,
            "filtered": "33.33",
            "cost_info": {
                "read_cost": "1.40",
                "eval_cost": "0.20",
                "prefix_cost": "1.60",
                "data_read_per_join": "288"
            },
            "used_columns": [
                "userid",
                "username",
                "pwd"
            ],
            "attached_condition": "(`testzc`.`user`.`userid` = 1)"
        }
    }
}
```

# EXPLAIN输出详解

下面是官网对EXPLAIN输出的详解：

[EXPLAIN Output Format](https://dev.mysql.com/doc/refman/5.7/en/explain-output.html)