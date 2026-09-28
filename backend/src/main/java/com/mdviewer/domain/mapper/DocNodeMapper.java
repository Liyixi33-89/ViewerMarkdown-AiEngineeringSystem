package com.mdviewer.domain.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.mdviewer.domain.entity.DocNode;
import org.apache.ibatis.annotations.Delete;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Select;
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

    /** 回收站专用：@TableLogic 自动追加 deleted=0，无法查已删列表，必须显式 SQL 绕过 */
    @Select("SELECT id, parent_id, name, type, path, deleted_at FROM doc_node " +
            "WHERE deleted = 1 ORDER BY deleted_at DESC, id DESC")
    java.util.List<DocNode> selectDeleted();

    /** 恢复子树：仅恢复与顶层条目同一删除批次（deleted_at 相同）的节点，
     *  避免把先于本批次独立删除的子孙一并复活（独立删除的节点保留自己的 deleted_at） */
    @Update("UPDATE doc_node SET deleted = 0, deleted_at = NULL " +
            "WHERE deleted = 1 AND deleted_at = #{deletedAt} " +
            "AND (path LIKE CONCAT(#{pathPrefix}, '%') OR id = #{id})")
    int restoreSubtree(@Param("pathPrefix") String pathPrefix, @Param("id") Long id,
                       @Param("deletedAt") java.time.LocalDateTime deletedAt);

    /** 彻底删除子树（物理删除，不可恢复；回收站「彻底删除」专用） */
    @Delete("DELETE FROM doc_node " +
            "WHERE deleted = 1 AND (path LIKE CONCAT(#{pathPrefix}, '%') OR id = #{id})")
    int purgeSubtree(@Param("pathPrefix") String pathPrefix, @Param("id") Long id);
}
