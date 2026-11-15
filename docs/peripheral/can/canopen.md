---
title: CANopen 简介
date: 2026-11-14
order: 2
---

# CANopen 简介

CAN 规定了报文怎么在总线上发送，例如如何仲裁和检测错误。CANopen 在此基础上定义设备怎样交换参数和运行数据，以及节点如何启动、报告状态和故障。本文介绍基于经典 CAN 的 CANopen CC，其应用层和通信规则由 CiA 301 定义。[CiA · CANopen](https://www.can-cia.org/can-knowledge/canopen)

## 对象字典

每个节点通过对象字典把参数和运行数据暴露给网络。对象字典用 **16 位索引和 8 位子索引**定位条目。设备规范可以进一步约定条目的含义，例如 CiA 402 定义了运动控制器和驱动器使用的控制字、状态字等对象。[CiA · 设备内部结构](https://www.can-cia.org/can-knowledge/canopen-internal-device-architecture/) · [CiA · 设备规范](https://www.can-cia.org/can-knowledge/canopen-profiles)

## 配置、运行数据和节点状态

| 名称 | 用途 |
| --- | --- |
| SDO | 通过请求和响应读写对象字典，常用于配置参数和查询诊断信息。 |
| PDO | 按预先约定的映射收发运行数据，例如目标速度和实际速度。CANopen CC 的一个 PDO 占一帧，最多携带 8 字节应用数据。 |
| NMT | 切换节点的通信状态。节点启动后通常进入 Pre-operational，可通过 SDO 配置。进入 Operational 后才可收发 PDO。 |
| Heartbeat | 启用后周期报告节点的 NMT 状态，接收方可以用超时判断节点是否失联。 |
| EMCY | 设备出现内部错误时主动报告错误信息。 |

[CiA · SDO](https://www.can-cia.org/can-knowledge/sdo-protocol/) · [CiA · PDO](https://www.can-cia.org/can-knowledge/pdo-protocol) · [CiA · NMT](https://www.can-cia.org/can-knowledge/network-management/) · [CiA · Heartbeat](https://www.can-cia.org/can-knowledge/error-control-protocols) · [CiA · EMCY](https://www.can-cia.org/can-knowledge/special-function-protocols)

## 以一台电机驱动器为例

控制器先等驱动器发出 Boot-up 报文，在 Pre-operational 状态通过 SDO 设置运行参数或 PDO 映射，然后用 NMT 将节点切到 Operational。运行期间用 PDO 发送控制命令、接收状态和速度反馈，并监测 Heartbeat。对 CiA 402 驱动器，NMT Operational 表示 PDO 通信可用，电机使能还要按驱动器自己的状态机处理。[CiA · NMT](https://www.can-cia.org/can-knowledge/network-management/) · [CiA · 设备规范](https://www.can-cia.org/can-knowledge/canopen-profiles)
