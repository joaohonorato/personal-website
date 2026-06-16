package com.joaohonorato.blog.controller

import com.joaohonorato.blog.model.Post
import com.joaohonorato.blog.repository.PostRepository
import jakarta.validation.Valid
import jakarta.validation.constraints.Min
import jakarta.validation.constraints.NotBlank
import org.springframework.http.ResponseEntity
import org.springframework.security.access.prepost.PreAuthorize
import org.springframework.web.bind.annotation.*
import java.time.Instant

@RestController
@RequestMapping("/api/posts")
class PostController(private val repo: PostRepository) {

    @GetMapping
    fun listPublished() = repo.findAllByPublishedTrueOrderByCreatedAtDesc()

    @GetMapping("/all")
    @PreAuthorize("isAuthenticated()")
    fun listAll() = repo.findAllByOrderByCreatedAtDesc()

    @GetMapping("/id/{id}")
    @PreAuthorize("isAuthenticated()")
    fun getById(@PathVariable id: Int): ResponseEntity<Post> =
        repo.findById(id)
            .map { ResponseEntity.ok(it) }
            .orElse(ResponseEntity.notFound().build())

    @GetMapping("/{slug}")
    fun getBySlug(@PathVariable slug: String): ResponseEntity<Post> =
        repo.findBySlug(slug)
            .map { ResponseEntity.ok(it) }
            .orElse(ResponseEntity.notFound().build())

    @PostMapping
    @PreAuthorize("hasAnyRole('WRITER', 'ADMIN')")
    fun create(@Valid @RequestBody body: PostRequest): Post {
        val post = Post(
            title = body.title,
            slug = body.slug,
            excerpt = body.excerpt,
            content = body.content,
            category = body.category,
            readingTimeMin = body.readingTimeMin,
            published = body.published,
            generatedByAgent = body.generatedByAgent,
            tags = body.tags.toTypedArray(),
        )
        return repo.save(post)
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('WRITER', 'ADMIN')")
    fun update(@PathVariable id: Int, @Valid @RequestBody body: PostRequest): ResponseEntity<Post> {
        val post = repo.findById(id).orElse(null) ?: return ResponseEntity.notFound().build()
        post.title = body.title
        post.slug = body.slug
        post.excerpt = body.excerpt
        post.content = body.content
        post.category = body.category
        post.readingTimeMin = body.readingTimeMin
        post.published = body.published
        post.generatedByAgent = body.generatedByAgent
        post.tags = body.tags.toTypedArray()
        post.updatedAt = Instant.now()
        return ResponseEntity.ok(repo.save(post))
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('WRITER', 'ADMIN')")
    fun delete(@PathVariable id: Int): ResponseEntity<Void> {
        if (!repo.existsById(id)) return ResponseEntity.notFound().build()
        repo.deleteById(id)
        return ResponseEntity.noContent().build()
    }
}

data class PostRequest(
    @field:NotBlank val title: String,
    @field:NotBlank val slug: String,
    val excerpt: String = "",
    val content: String = "",
    val category: String = "",
    @field:Min(1) val readingTimeMin: Int = 1,
    val published: Boolean = true,
    val generatedByAgent: Boolean = false,
    val tags: List<String> = emptyList(),
)