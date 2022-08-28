---
title: MySQL(四) InnoDB Buffer Pool
date: 2021-08-16 10:20:43
tags:
    - 数据库
    - MySQL
---
# 前言

这篇文章演示环境为：MySQL5.7。

主要内容为基于[MySQL5.7官方文档](https://dev.mysql.com/doc/refman/5.7/en/)的学习，对InnoDB buffer pool相关内容的整理及自己的理解。

如有错误或疑问，欢迎讨论！

<!-- more -->

# 概念

[MySQL :: MySQL 5.7 Reference Manual :: 14.5.1 Buffer Pool](https://dev.mysql.com/doc/refman/5.7/en/innodb-buffer-pool.html)

通过官方文档的描述，可以发现

`The buffer pool is an area in main memory where `InnoDB` caches table and index data as it is accessed. The buffer pool permits frequently used data to be accessed directly from memory, which speeds up processing. On dedicated servers, up to 80% of physical memory is often assigned to the buffer pool.`

1. buffer pool是存在于内存中;

2. 在InnoDB存储引擎访问缓存表与索引数据时会用到;

3. buffer pool可以用来加快数据处理速度(调优的一个方向)。

所以，buffer pool是由InnoDB存储引擎管理的一块存在于内存的缓存区。

在实际生产环境中，根据数据容量，物理机性能，Buffer Pool设置越大，MySQL性能越好。

# Buffer Pool的状态

使用*show engine innodb status\G*命令查看Buffer Pool状态。

```sql
mysql> show engine innodb status\G;
-------------省略其他输出-------------
----------------------
BUFFER POOL AND MEMORY
----------------------
Total large memory allocated 137428992                      -- mysql总共分配的内存大小，单位byte
Dictionary memory allocated 163016                          -- mysql数据字典内存区大小，单位byte
Buffer pool size   8192                                     -- Buffer Pool中页的总数，实际占用内存为8192*16K=128M
Free buffers       6578                                     -- Buffer Pool中空白页数量（Free List），实际占用内存为6578*16K≈102M
Database pages     1611                                     -- Buffer Pool中使用的页数量（LRU List），实际占用内存为1611*16K≈25M
Old database pages 574                                      -- Buffer Pool中Old Pages数量
Modified db pages  0                                        -- 脏页
Pending reads      0
Pending writes: LRU 0, flush list 0, single page 0
Pages made young 218, not young 1
0.00 youngs/s, 0.00 non-youngs/s
Pages read 332, created 3931, written 6370
0.00 reads/s, 0.00 creates/s, 0.00 writes/s
No buffer pool page gets since the last printout
Pages read ahead 0.00/s, evicted without access 0.00/s, Random read ahead 0.00/s
LRU len: 1611, unzip_LRU len: 0
I/O sum[0]:cur[0], unzip sum[0]:cur[0]
-------------省略其他输出-------------
```

# 预读

首先，我们了解数据文件是存储在磁盘上的，而且对于计算机来说，内存的读取速度是远远大于磁盘的

那么，如果我们每次更新操作都落地到磁盘上，那么IO代价就会太大了

所以，InnoDB在读取数据时，不是按需读取，而是按页读取，因为**局部性原则**，在数据访问时，使用一些数据，大概率会使用
附近的数据，从而通过按页读取会省去后续读取的IO操作，从而提高效率。

> MySQL默认一页16K
>
> [MySQL :: MySQL 5.7 Reference Manual :: 14.15 InnoDB Startup Options and System Variables](https://dev.mysql.com/doc/refman/5.7/en/innodb-parameters.html#sysvar_innodb_page_size)

InnoDB的两种预读算法：

[关于MySQL buffer pool的预读机制 - GeaoZhang - 博客园 (cnblogs.com)](https://www.cnblogs.com/geaozhang/p/7397699.html)

# LRU算法

![buffer pool list](https://dev.mysql.com/doc/refman/5.7/en/images/innodb-buffer-pool-list.png)

buffer pool使用LRU算法的变种来管理

InnoDB将buffer pool内存区域分成两块：new sublist、old sublist，内存区域中点为new sublist的尾节点与old sublist的头节点;

当InnoDB将一个新的数据页读入buffer pool时，将新数据页插入到old sublist的头节点处，若buffer pool无空间用于插入新数据页，
则清理buffer pool中old sublist的尾节点;

当访问old sublist中数据页时，将其置入new sublist的头节点;

随着数据的访问，buffer pool中未被访问的数据页，会逐步老化，当数据页到达old sublist尾节点时，若插入新数据页，则将其清理;