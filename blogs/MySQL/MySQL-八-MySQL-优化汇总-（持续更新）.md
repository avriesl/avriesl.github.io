---
title: MySQL(八) MySQL 优化汇总 （持续更新）
date: 2021-08-19 10:08:12
tags:
    - 数据库 
    - MySQL
---

# 前言

这篇文章演示环境为：MySQL5.7。

主要内容为基于[MySQL5.7官方文档](https://dev.mysql.com/doc/refman/5.7/en/)的学习，对MySQL优化相关内容的整理及自己的理解。

如有错误或疑问，欢迎讨论！

本文会持续保持更新。

<!-- more -->

# 定位不合理索引

索引一般建立在离散度（字段值的重复程度越高，离散度越低）高的字段上，
通过这一点再结合*information_schema*数据库下的元数据表*TABLES*、*STATISTICS*就可以查询出当前数据库的各索引离散度。

SQL如下：

```sql
mysql> SELECT 
       t.TABLE_SCHEMA,
       t.TABLE_NAME,
       INDEX_NAME,
       CARDINALITY,
       TABLE_ROWS,
       CARDINALITY / TABLE_ROWS AS SELECTIVITY 
     FROM
       information_schema.TABLES t,
       (SELECT 
         table_schema,
         table_name,
         index_name,
         cardinality 
       FROM
         information_schema.STATISTICS 
       WHERE (
           table_schema,
           table_name,
           index_name,
           seq_in_index
         ) IN 
         (SELECT 
           table_schema,
           table_name,
           index_name,
           MAX(seq_in_index) 
         FROM
           information_schema.STATISTICS 
         GROUP BY table_schema,
           table_name,
           index_name)) s 
     WHERE t.table_schema = s.table_schema 
       AND t.table_name = s.table_name 
       AND t.table_rows != 0 
       AND t.table_schema NOT IN (
         'mysql',
         'performance_schema',
         'information_schema'
       ) 
     ORDER BY SELECTIVITY ;
+--------------+-------------+------------+-------------+------------+-------------+
| TABLE_SCHEMA | TABLE_NAME  | index_name | cardinality | TABLE_ROWS | SELECTIVITY |
+--------------+-------------+------------+-------------+------------+-------------+
| testzc       | student     | zhsy       |           4 |          4 |      1.0000 |
| testzc       | user_memory | PRIMARY    |           3 |          3 |      1.0000 |
| sys          | sys_config  | PRIMARY    |           6 |          6 |      1.0000 |
| testzc       | user_innodb | PRIMARY    |           4 |          4 |      1.0000 |
| testzc       | user_myisam | PRIMARY    |           3 |          3 |      1.0000 |
| testzc       | student     | PRIMARY    |           4 |          4 |      1.0000 |
| testzc       | user_innodb | index_name |           4 |          4 |      1.0000 |
+--------------+-------------+------------+-------------+------------+-------------+
```

查询结果中cardinality/TABLE_ROWS越小就代表该索引字段重复度越高。
SELECTIVITY越高就代表该索引字段离散度越高。

