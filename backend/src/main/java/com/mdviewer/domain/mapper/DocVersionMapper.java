package com.mdviewer.domain.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.mdviewer.domain.entity.DocVersion;
import org.apache.ibatis.annotations.Delete;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Select;

import java.util.List;

@Mapper
public interface DocVersionMapper extends BaseMapper<DocVersion> {

    /** 清理旧版本：仅保留每篇文档最近 keepCount 版（回滚前的批量修剪） */
    @Delete("DELETE FROM doc_version WHERE doc_id = #{docId} AND id NOT IN " +
            "(SELECT id FROM (SELECT id FROM doc_version WHERE doc_id = #{docId} " +
            "ORDER BY id DESC LIMIT #{keepCount}) t)")
    int trimToLatest(@Param("docId") Long docId, @Param("keepCount") int keepCount);

    /** 调试用：全表计数（H2/MySQL 通用） */
    @Select("SELECT COUNT(*) FROM doc_version")
    long countAll();
}
