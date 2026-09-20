package com.mdviewer.domain.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.mdviewer.domain.entity.AdminUser;
import org.apache.ibatis.annotations.Mapper;

@Mapper
public interface AdminUserMapper extends BaseMapper<AdminUser> {
}
