package com.mdviewer.common;

/** 业务异常：携带业务错误码（技术设计文档 3.3.3） */
public class BizException extends RuntimeException {
    private final int code;

    public BizException(int code, String msg) {
        super(msg);
        this.code = code;
    }

    public int getCode() { return code; }
}
