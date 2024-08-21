# UART 驱动

在commit 33b99ca 中的esp_err_t uart_flush_input(uart_port_t uart_num)增加了对rx_buffer_len的清空操作：

```c
        if(data == NULL) {
            if( p_uart_obj[uart_num]->rx_buffered_len != 0 ) {
                ESP_LOGE(UART_TAG, "rx_buffered_len error");
                p_uart_obj[uart_num]->rx_buffered_len = 0;
            }
            //We also need to clear the `rx_buffer_full_flg` here.
            UART_ENTER_CRITICAL(&uart_spinlock[uart_num]);
            p_uart_obj[uart_num]->rx_buffer_full_flg = false;
            UART_EXIT_CRITICAL(&uart_spinlock[uart_num]);
            break;
        }

```

commit的描述是：driver(uart):Fix the bug that uart buffer_full flag is true all the time.

以下是更新`rx_buffered_len`的地方：

```c
static void UART_ISR_ATTR uart_rx_intr_handler_default(void *param);
int uart_read_bytes(uart_port_t uart_num, void *buf, uint32_t length, TickType_t ticks_to_wait);

```


