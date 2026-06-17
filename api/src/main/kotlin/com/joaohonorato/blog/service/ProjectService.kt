package com.joaohonorato.blog.service

import com.joaohonorato.blog.dto.ProjectResponse
import com.joaohonorato.blog.dto.toResponse
import com.joaohonorato.blog.exception.ResourceNotFoundException
import com.joaohonorato.blog.model.Project
import com.joaohonorato.blog.repository.GithubRepoRepository
import com.joaohonorato.blog.repository.PostRepository
import com.joaohonorato.blog.repository.ProjectRepository
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.time.Instant

@Service
class ProjectService(
    private val projectRepo: ProjectRepository,
    private val repoRepo: GithubRepoRepository,
    private val postRepo: PostRepository,
) {
    @Transactional(readOnly = true)
    fun listAll(): List<ProjectResponse> = projectRepo.findAll().map { it.toResponse() }

    @Transactional(readOnly = true)
    fun getById(id: Int): ProjectResponse =
        projectRepo.findById(id).map { it.toResponse() }
            .orElseThrow { ResourceNotFoundException("Project", id) }

    @Transactional
    fun create(request: ProjectRequest): ProjectResponse {
        val project = Project(
            name = request.name,
            description = request.description ?: "",
            repos = repoRepo.findAllById(request.repoIds).toMutableList(),
            posts = postRepo.findAllById(request.postIds).toMutableList(),
        )
        return projectRepo.save(project).toResponse()
    }

    @Transactional
    fun update(id: Int, request: ProjectRequest): ProjectResponse {
        val project = projectRepo.findById(id).orElseThrow { ResourceNotFoundException("Project", id) }
        project.apply {
            name = request.name
            description = request.description ?: ""
            repos = repoRepo.findAllById(request.repoIds).toMutableList()
            posts = postRepo.findAllById(request.postIds).toMutableList()
            updatedAt = Instant.now()
        }
        return projectRepo.save(project).toResponse()
    }

    @Transactional
    fun delete(id: Int) {
        if (!projectRepo.existsById(id)) throw ResourceNotFoundException("Project", id)
        projectRepo.deleteById(id)
    }
}

data class ProjectRequest(
    val name: String,
    val description: String? = null,
    val repoIds: List<Int> = emptyList(),
    val postIds: List<Int> = emptyList(),
)