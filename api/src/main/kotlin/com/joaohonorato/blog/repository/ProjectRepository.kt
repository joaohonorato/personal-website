package com.joaohonorato.blog.repository

import com.joaohonorato.blog.model.Project
import org.springframework.data.jpa.repository.JpaRepository

interface ProjectRepository : JpaRepository<Project, Int>