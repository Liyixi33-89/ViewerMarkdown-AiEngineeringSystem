package com.mdviewer.domain.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.mdviewer.domain.entity.DocNode;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Update;

@Mapper
public interface DocNodeMapper extends BaseMapper<DocNode> {

    /**
     * 软删除整棵子树（按物化路径前缀）。
     * 注意：不能走实体 updateById —— @TableLogic 字段被 MP 托管，手动 set 后仍会被忽略，
     * 导致 deleted 永远是 0（已踩坑）。必须用显式 SQL 直接写 deleted 列。
     */
    @Update("UPDATE doc_node SET deleted = 1, deleted_at = #{deletedAt} " +
            "WHERE deleted = 0 AND (path LIKE CONCAT(#{pathPrefix}, '%') OR id = #{id})")
    int softDeleteSubtree(@Param("pathPrefix") String pathPrefix,
                           @Param("id") Long id,
                           @Param("deletedAt") java.time.LocalDateTime deletedAt);
}
