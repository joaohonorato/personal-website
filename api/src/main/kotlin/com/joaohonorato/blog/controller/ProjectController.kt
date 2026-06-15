package com.joaohonorato.blog.controller

import com.joaohonorato.blog.model.Project
import com.joaohonorato.blog.repository.GithubRepoRepository
import com.joaohonorato.blog.repository.PostRepository
import com.joaohonorato.blog.repository.ProjectRepository
import jakarta.validation.Valid
import jakarta.validation.constraints.NotBlank
import org.springframework.http.ResponseEntity
import org.springframework.security.access.prepost.PreAuthorize
import org.springframework.web.bind.annotation.*
import java.time.Instant

@RestController
@RequestMapping("/api/projects")
class ProjectController(
    private val projectRepo: ProjectRepository,
    private val repoRepo: GithubRepoRepository,
    private val postRepo: PostRepository,
) {

    @GetMapping
    fun listAll() = projectRepo.findAll()

    @GetMapping("/{id}")
    @PreAuthorize("isAuthenticated()")
    fun getById(@PathVariable id: Int): ResponseEntity<Project> =
        projectRepo.findById(id)
            .map { ResponseEntity.ok(it) }
            .orElse(ResponseEntity.notFound().build())

    @PostMapping
    @PreAuthorize("isAuthenticated()")
    fun create(@Valid @RequestBody body: ProjectRequest): Project {
        val project = Project(
            name = body.name,
            description = body.description ?: "",
            repos = repoRepo.findAllById(body.repoIds).toMutableList(),
            posts = postRepo.findAllById(body.postIds).toMutableList(),
        )
        return projectRepo.save(project)
    }

    @PutMapping("/{id}")
    @PreAuthorize("isAuthenticated()")
    fun update(@PathVariable id: Int, @Valid @RequestBody body: ProjectRequest): ResponseEntity<Project> {
        val project = projectRepo.findById(id).orElse(null) ?: return ResponseEntity.notFound().build()
        project.name = body.name
        project.description = body.description ?: ""
        project.repos = repoRepo.findAllById(body.repoIds).toMutableList()
        project.posts = postRepo.findAllById(body.postIds).toMutableList()
        project.updatedAt = Instant.now()
        return ResponseEntity.ok(projectRepo.save(project))
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("isAuthenticated()")
    fun delete(@PathVariable id: Int): ResponseEntity<Void> {
        if (!projectRepo.existsById(id)) return ResponseEntity.notFound().build()
        projectRepo.deleteById(id)
        return ResponseEntity.noContent().build()
    }
}

data class ProjectRequest(
    @field:NotBlank val name: String,
    val description: String? = null,
    val repoIds: List<Int> = emptyList(),
    val postIds: List<Int> = emptyList(),
)