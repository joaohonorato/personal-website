package com.joaohonorato.blog.controller

import com.joaohonorato.blog.dto.ProjectResponse
import com.joaohonorato.blog.service.ProjectRequest
import com.joaohonorato.blog.service.ProjectService
import jakarta.validation.Valid
import jakarta.validation.constraints.NotBlank
import org.springframework.http.ResponseEntity
import org.springframework.security.access.prepost.PreAuthorize
import org.springframework.web.bind.annotation.*

@RestController
@RequestMapping("/api/projects")
class ProjectController(private val projectService: ProjectService) {

    @GetMapping
    fun listAll(): List<ProjectResponse> = projectService.listAll()

    @GetMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    fun getById(@PathVariable id: Int): ProjectResponse = projectService.getById(id)

    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    fun create(@Valid @RequestBody body: ProjectRequestDto): ProjectResponse =
        projectService.create(body.toServiceRequest())

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    fun update(@PathVariable id: Int, @Valid @RequestBody body: ProjectRequestDto): ProjectResponse =
        projectService.update(id, body.toServiceRequest())

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    fun delete(@PathVariable id: Int): ResponseEntity<Void> {
        projectService.delete(id)
        return ResponseEntity.noContent().build()
    }
}

data class ProjectRequestDto(
    @field:NotBlank val name: String,
    val description: String? = null,
    val repoIds: List<Int> = emptyList(),
    val postIds: List<Int> = emptyList(),
)

private fun ProjectRequestDto.toServiceRequest() = ProjectRequest(
    name = name,
    description = description,
    repoIds = repoIds,
    postIds = postIds,
)