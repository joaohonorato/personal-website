package com.joaohonorato.blog.dto

import com.joaohonorato.blog.model.Project
import java.time.Instant

data class ProjectResponse(
    val id: Int,
    val name: String,
    val description: String,
    val createdAt: Instant,
    val updatedAt: Instant,
    val repos: List<RepoSummary>,
    val posts: List<PostSummary>,
)

data class RepoSummary(val id: Int, val name: String, val url: String, val language: String?, val stars: Int)

data class PostSummary(val id: Int, val title: String, val slug: String)

fun Project.toResponse() = ProjectResponse(
    id = id!!,
    name = name,
    description = description,
    createdAt = createdAt,
    updatedAt = updatedAt,
    repos = repos.map { RepoSummary(it.id!!, it.name, it.url, it.language, it.stars) },
    posts = posts.map { PostSummary(it.id!!, it.title, it.slug) },
)