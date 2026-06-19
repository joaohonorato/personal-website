package com.joaohonorato.blog.service

import com.joaohonorato.blog.dto.PostResponse
import com.joaohonorato.blog.dto.toResponse
import com.joaohonorato.blog.exception.ResourceNotFoundException
import com.joaohonorato.blog.model.Post
import com.joaohonorato.blog.repository.PostRepository
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.time.Instant

@Service
class PostService(private val postRepo: PostRepository) {

    @Transactional(readOnly = true)
    fun listPublished(): List<PostResponse> =
        postRepo.findAllByPublishedTrueOrderByCreatedAtDesc().map { it.toResponse() }

    @Transactional(readOnly = true)
    fun listAll(): List<PostResponse> =
        postRepo.findAllByOrderByCreatedAtDesc().map { it.toResponse() }

    @Transactional(readOnly = true)
    fun getById(id: Int): PostResponse =
        postRepo.findById(id).map { it.toResponse() }
            .orElseThrow { ResourceNotFoundException("Post", id) }

    @Transactional(readOnly = true)
    fun getBySlug(slug: String): PostResponse =
        postRepo.findBySlug(slug).map { it.toResponse() }
            .orElseThrow { ResourceNotFoundException("Post", slug) }

    @Transactional
    fun create(request: PostRequest): PostResponse =
        postRepo.save(request.toEntity()).toResponse()

    @Transactional
    fun update(id: Int, request: PostRequest): PostResponse {
        val post = postRepo.findById(id).orElseThrow { ResourceNotFoundException("Post", id) }
        post.apply {
            title = request.title
            slug = request.slug
            excerpt = request.excerpt
            content = request.content
            category = request.category
            readingTimeMin = request.readingTimeMin
            published = request.published
            generatedByAgent = request.generatedByAgent
            coverImageUrl = request.coverImageUrl
            tags = request.tags.toTypedArray()
            updatedAt = Instant.now()
        }
        return postRepo.save(post).toResponse()
    }

    @Transactional
    fun delete(id: Int) {
        if (!postRepo.existsById(id)) throw ResourceNotFoundException("Post", id)
        postRepo.deleteById(id)
    }
}

data class PostRequest(
    val title: String,
    val slug: String,
    val excerpt: String = "",
    val content: String = "",
    val category: String = "",
    val readingTimeMin: Int = 1,
    val published: Boolean = true,
    val generatedByAgent: Boolean = false,
    val coverImageUrl: String? = null,
    val tags: List<String> = emptyList(),
)

private fun PostRequest.toEntity() = Post(
    title = title,
    slug = slug,
    excerpt = excerpt,
    content = content,
    category = category,
    readingTimeMin = readingTimeMin,
    published = published,
    generatedByAgent = generatedByAgent,
    coverImageUrl = coverImageUrl,
    tags = tags.toTypedArray(),
)