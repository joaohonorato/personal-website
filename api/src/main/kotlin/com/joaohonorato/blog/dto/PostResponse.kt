package com.joaohonorato.blog.dto

import com.joaohonorato.blog.model.Post
import java.time.Instant

data class PostResponse(
    val id: Int,
    val slug: String,
    val title: String,
    val excerpt: String,
    val content: String,
    val category: String,
    val tags: List<String>,
    val published: Boolean,
    val generatedByAgent: Boolean,
    val coverImageUrl: String?,
    val readingTimeMin: Int,
    val createdAt: Instant,
    val updatedAt: Instant,
    val linkedinPostUrl: String?,
    val linkedinPublishedAt: Instant?,
)

fun Post.toResponse() = PostResponse(
    id = id!!,
    slug = slug,
    title = title,
    excerpt = excerpt,
    content = content,
    category = category,
    tags = tags.toList(),
    published = published,
    generatedByAgent = generatedByAgent,
    coverImageUrl = coverImageUrl,
    readingTimeMin = readingTimeMin,
    createdAt = createdAt,
    updatedAt = updatedAt,
    linkedinPostUrl = linkedinPostUrl,
    linkedinPublishedAt = linkedinPublishedAt,
)