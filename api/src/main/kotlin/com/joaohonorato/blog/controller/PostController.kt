package com.joaohonorato.blog.controller

import com.joaohonorato.blog.dto.PostResponse
import com.joaohonorato.blog.service.PostRequest
import com.joaohonorato.blog.service.PostService
import jakarta.validation.Valid
import jakarta.validation.constraints.Min
import jakarta.validation.constraints.NotBlank
import org.springframework.http.ResponseEntity
import org.springframework.security.access.prepost.PreAuthorize
import org.springframework.web.bind.annotation.*

@RestController
@RequestMapping("/api/posts")
class PostController(private val postService: PostService) {

    @GetMapping
    fun listPublished(): List<PostResponse> = postService.listPublished()

    @GetMapping("/all")
    @PreAuthorize("isAuthenticated()")
    fun listAll(): List<PostResponse> = postService.listAll()

    @GetMapping("/id/{id}")
    @PreAuthorize("isAuthenticated()")
    fun getById(@PathVariable id: Int): PostResponse = postService.getById(id)

    @GetMapping("/{slug}")
    fun getBySlug(@PathVariable slug: String): PostResponse = postService.getBySlug(slug)

    @PostMapping
    @PreAuthorize("hasAnyRole('WRITER', 'ADMIN')")
    fun create(@Valid @RequestBody body: PostRequestDto): PostResponse =
        postService.create(body.toServiceRequest())

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('WRITER', 'ADMIN')")
    fun update(@PathVariable id: Int, @Valid @RequestBody body: PostRequestDto): PostResponse =
        postService.update(id, body.toServiceRequest())

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('WRITER', 'ADMIN')")
    fun delete(@PathVariable id: Int): ResponseEntity<Void> {
        postService.delete(id)
        return ResponseEntity.noContent().build()
    }
}

data class PostRequestDto(
    @field:NotBlank val title: String,
    @field:NotBlank val slug: String,
    val excerpt: String? = null,
    val content: String? = null,
    val category: String? = null,
    @field:Min(1) val readingTimeMin: Int = 1,
    val published: Boolean = true,
    val generatedByAgent: Boolean = false,
    val coverImageUrl: String? = null,
    val tags: List<String>? = null,
)

private fun PostRequestDto.toServiceRequest() = PostRequest(
    title = title,
    slug = slug,
    excerpt = excerpt ?: "",
    content = content ?: "",
    category = category ?: "",
    readingTimeMin = readingTimeMin,
    published = published,
    generatedByAgent = generatedByAgent,
    coverImageUrl = coverImageUrl,
    tags = tags ?: emptyList(),
)