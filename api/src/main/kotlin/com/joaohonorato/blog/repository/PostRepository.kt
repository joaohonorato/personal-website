package com.joaohonorato.blog.repository

import com.joaohonorato.blog.model.Post
import org.springframework.data.jpa.repository.JpaRepository
import java.util.Optional

interface PostRepository : JpaRepository<Post, Int> {
    fun findBySlug(slug: String): Optional<Post>
    fun findAllByPublishedTrueOrderByCreatedAtDesc(): List<Post>
    fun findAllByOrderByCreatedAtDesc(): List<Post>
}