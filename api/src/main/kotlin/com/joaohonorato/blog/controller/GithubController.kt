package com.joaohonorato.blog.controller

import com.joaohonorato.blog.model.GithubRepo
import com.joaohonorato.blog.service.GithubService
import org.springframework.security.access.prepost.PreAuthorize
import org.springframework.web.bind.annotation.*

@RestController
@RequestMapping("/api/github")
class GithubController(private val githubService: GithubService) {

    @GetMapping("/repos")
    @PreAuthorize("isAuthenticated()")
    fun listRepos(): List<GithubRepo> = githubService.listRepos()

    @PostMapping("/sync")
    @PreAuthorize("hasRole('ADMIN')")
    fun sync(): Map<String, Any> = githubService.sync()
}