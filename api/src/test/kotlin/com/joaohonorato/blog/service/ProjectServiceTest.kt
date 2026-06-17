package com.joaohonorato.blog.service

import com.joaohonorato.blog.exception.ResourceNotFoundException
import com.joaohonorato.blog.model.Project
import com.joaohonorato.blog.repository.GithubRepoRepository
import com.joaohonorato.blog.repository.PostRepository
import com.joaohonorato.blog.repository.ProjectRepository
import io.mockk.every
import io.mockk.mockk
import io.mockk.verify
import java.time.Instant
import java.util.Optional
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFailsWith

class ProjectServiceTest {

    private val projectRepo = mockk<ProjectRepository>()
    private val repoRepo = mockk<GithubRepoRepository>()
    private val postRepo = mockk<PostRepository>()

    private val service = ProjectService(projectRepo, repoRepo, postRepo)

    private fun makeProject(id: Int = 1, name: String = "My Project") = Project(
        id = id,
        name = name,
        description = "desc",
        createdAt = Instant.now(),
        updatedAt = Instant.now(),
        repos = mutableListOf(),
        posts = mutableListOf(),
    )

    // ── listAll ───────────────────────────────────────────────────────────────

    @Test
    fun `listAll returns all projects mapped to response`() {
        every { projectRepo.findAll() } returns listOf(makeProject(1, "A"), makeProject(2, "B"))

        val result = service.listAll()

        assertEquals(2, result.size)
        assertEquals("A", result[0].name)
        assertEquals("B", result[1].name)
    }

    // ── getById ───────────────────────────────────────────────────────────────

    @Test
    fun `getById returns project when found`() {
        every { projectRepo.findById(1) } returns Optional.of(makeProject(1, "Found"))

        val result = service.getById(1)

        assertEquals("Found", result.name)
        assertEquals(emptyList(), result.repos)
        assertEquals(emptyList(), result.posts)
    }

    @Test
    fun `getById throws ResourceNotFoundException when not found`() {
        every { projectRepo.findById(99) } returns Optional.empty()

        assertFailsWith<ResourceNotFoundException> { service.getById(99) }
    }

    // ── create ────────────────────────────────────────────────────────────────

    @Test
    fun `create saves project with resolved repos and posts`() {
        every { repoRepo.findAllById(listOf(1, 2)) } returns emptyList()
        every { postRepo.findAllById(listOf(3)) } returns emptyList()
        every { projectRepo.save(any()) } answers { firstArg<Project>().also { p -> p.apply { /* id set by DB */ } }.let { makeProject(id = 10, name = "New") } }

        val result = service.create(ProjectRequest(name = "New", repoIds = listOf(1, 2), postIds = listOf(3)))

        assertEquals("New", result.name)
        verify { repoRepo.findAllById(listOf(1, 2)) }
        verify { postRepo.findAllById(listOf(3)) }
    }

    // ── update ────────────────────────────────────────────────────────────────

    @Test
    fun `update modifies name and description`() {
        val existing = makeProject(id = 1, name = "Old")
        every { projectRepo.findById(1) } returns Optional.of(existing)
        every { repoRepo.findAllById(emptyList()) } returns emptyList()
        every { postRepo.findAllById(emptyList()) } returns emptyList()
        every { projectRepo.save(any()) } answers { firstArg() }

        val result = service.update(1, ProjectRequest(name = "Updated", description = "new desc"))

        assertEquals("Updated", result.name)
        assertEquals("new desc", result.description)
    }

    @Test
    fun `update throws ResourceNotFoundException when not found`() {
        every { projectRepo.findById(99) } returns Optional.empty()

        assertFailsWith<ResourceNotFoundException> {
            service.update(99, ProjectRequest(name = "x"))
        }
    }

    // ── delete ────────────────────────────────────────────────────────────────

    @Test
    fun `delete calls deleteById when project exists`() {
        every { projectRepo.existsById(1) } returns true
        every { projectRepo.deleteById(1) } returns Unit

        service.delete(1)

        verify { projectRepo.deleteById(1) }
    }

    @Test
    fun `delete throws ResourceNotFoundException when project not found`() {
        every { projectRepo.existsById(99) } returns false

        assertFailsWith<ResourceNotFoundException> { service.delete(99) }
    }
}