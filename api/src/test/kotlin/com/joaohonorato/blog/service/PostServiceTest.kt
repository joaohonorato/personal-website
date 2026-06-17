package com.joaohonorato.blog.service

import com.joaohonorato.blog.exception.ResourceNotFoundException
import com.joaohonorato.blog.model.Post
import com.joaohonorato.blog.repository.PostRepository
import io.mockk.every
import io.mockk.mockk
import io.mockk.verify
import java.time.Instant
import java.util.Optional
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFailsWith
import kotlin.test.assertFalse
import kotlin.test.assertTrue

class PostServiceTest {

    private val postRepo = mockk<PostRepository>()
    private val service = PostService(postRepo)

    private fun makePost(
        id: Int = 1,
        slug: String = "test-slug",
        title: String = "Test Post",
        published: Boolean = true,
    ) = Post(
        id = id,
        slug = slug,
        title = title,
        excerpt = "excerpt",
        content = "content",
        category = "tech",
        tags = arrayOf("kotlin"),
        published = published,
        generatedByAgent = false,
        readingTimeMin = 3,
        createdAt = Instant.now(),
        updatedAt = Instant.now(),
    )

    // ── listPublished ─────────────────────────────────────────────────────────

    @Test
    fun `listPublished returns only published posts`() {
        every { postRepo.findAllByPublishedTrueOrderByCreatedAtDesc() } returns listOf(makePost(published = true))

        val result = service.listPublished()

        assertEquals(1, result.size)
        assertTrue(result[0].published)
    }

    // ── listAll ───────────────────────────────────────────────────────────────

    @Test
    fun `listAll returns all posts including drafts`() {
        every { postRepo.findAllByOrderByCreatedAtDesc() } returns listOf(
            makePost(id = 1, published = true),
            makePost(id = 2, published = false),
        )

        val result = service.listAll()

        assertEquals(2, result.size)
    }

    // ── getById ───────────────────────────────────────────────────────────────

    @Test
    fun `getById returns post when found`() {
        every { postRepo.findById(1) } returns Optional.of(makePost(id = 1, title = "Found"))

        val result = service.getById(1)

        assertEquals("Found", result.title)
    }

    @Test
    fun `getById throws ResourceNotFoundException when not found`() {
        every { postRepo.findById(99) } returns Optional.empty()

        assertFailsWith<ResourceNotFoundException> { service.getById(99) }
    }

    // ── getBySlug ─────────────────────────────────────────────────────────────

    @Test
    fun `getBySlug returns post when slug matches`() {
        every { postRepo.findBySlug("my-slug") } returns Optional.of(makePost(slug = "my-slug"))

        val result = service.getBySlug("my-slug")

        assertEquals("my-slug", result.slug)
    }

    @Test
    fun `getBySlug throws ResourceNotFoundException when slug not found`() {
        every { postRepo.findBySlug("missing") } returns Optional.empty()

        assertFailsWith<ResourceNotFoundException> { service.getBySlug("missing") }
    }

    // ── create ────────────────────────────────────────────────────────────────

    @Test
    fun `create saves post and returns response`() {
        val request = PostRequest(title = "New Post", slug = "new-post", published = false)
        every { postRepo.save(any()) } answers {
            firstArg<Post>().also { it.apply { } }.let { makePost(id = 10, slug = "new-post", title = "New Post", published = false) }
        }

        val result = service.create(request)

        assertEquals("new-post", result.slug)
        assertFalse(result.published)
        verify { postRepo.save(any()) }
    }

    // ── update ────────────────────────────────────────────────────────────────

    @Test
    fun `update modifies post fields and saves`() {
        val existing = makePost(id = 1, title = "Old Title", slug = "old-slug")
        every { postRepo.findById(1) } returns Optional.of(existing)
        every { postRepo.save(any()) } answers { firstArg() }

        val request = PostRequest(title = "New Title", slug = "new-slug")
        val result = service.update(1, request)

        assertEquals("New Title", result.title)
        assertEquals("new-slug", result.slug)
        verify { postRepo.save(existing) }
    }

    @Test
    fun `update throws ResourceNotFoundException when post not found`() {
        every { postRepo.findById(99) } returns Optional.empty()

        assertFailsWith<ResourceNotFoundException> {
            service.update(99, PostRequest(title = "x", slug = "x"))
        }
    }

    // ── delete ────────────────────────────────────────────────────────────────

    @Test
    fun `delete calls deleteById when post exists`() {
        every { postRepo.existsById(1) } returns true
        every { postRepo.deleteById(1) } returns Unit

        service.delete(1)

        verify { postRepo.deleteById(1) }
    }

    @Test
    fun `delete throws ResourceNotFoundException when post not found`() {
        every { postRepo.existsById(99) } returns false

        assertFailsWith<ResourceNotFoundException> { service.delete(99) }
    }

    // ── tags mapping ──────────────────────────────────────────────────────────

    @Test
    fun `response converts Array tags to List`() {
        val post = makePost().also { it.tags = arrayOf("kotlin", "spring") }
        every { postRepo.findById(1) } returns Optional.of(post)

        val result = service.getById(1)

        assertEquals(listOf("kotlin", "spring"), result.tags)
    }
}