package com.joaohonorato.blog.controller

import com.fasterxml.jackson.annotation.JsonProperty
import com.joaohonorato.blog.model.GithubRepo
import com.joaohonorato.blog.repository.GithubRepoRepository
import org.springframework.beans.factory.annotation.Value
import org.springframework.core.ParameterizedTypeReference
import org.springframework.http.HttpHeaders
import org.springframework.security.access.prepost.PreAuthorize
import org.springframework.web.bind.annotation.*
import org.springframework.web.client.RestClient
import java.time.Instant

data class GithubRepoRaw(
    val id: Long,
    val name: String,
    @JsonProperty("full_name") val fullName: String,
    val description: String?,
    @JsonProperty("html_url") val htmlUrl: String,
    val language: String?,
    @JsonProperty("stargazers_count") val stargazersCount: Int = 0,
    val topics: List<String> = emptyList(),
    val private: Boolean,
)

@RestController
@RequestMapping("/api/github")
class GithubController(
    private val repoRepository: GithubRepoRepository,
    @Value("\${app.github.token}") private val githubToken: String,
    @Value("\${app.github.username}") private val githubUsername: String,
) {

    private val listType = object : ParameterizedTypeReference<List<GithubRepoRaw>>() {}

    @GetMapping("/repos")
    @PreAuthorize("isAuthenticated()")
    fun listRepos() = repoRepository.findAll()

    @PostMapping("/sync")
    @PreAuthorize("isAuthenticated()")
    fun sync(): Map<String, Any> {
        val client = RestClient.builder()
            .baseUrl("https://api.github.com")
            .defaultHeader(HttpHeaders.AUTHORIZATION, "Bearer $githubToken")
            .defaultHeader(HttpHeaders.ACCEPT, "application/vnd.github+json")
            .build()

        val rawRepos = mutableListOf<GithubRepoRaw>()
        var page = 1
        while (true) {
            val pageResult = client.get()
                .uri("/user/repos?per_page=100&page=$page&sort=updated")
                .retrieve()
                .body(listType) ?: break
            if (pageResult.isEmpty()) break
            rawRepos.addAll(pageResult)
            page++
        }

        val saved = rawRepos.map { raw ->
            val existing = repoRepository.findByGithubId(raw.id.toInt()).orElse(null)
            GithubRepo(
                id = existing?.id,
                githubId = raw.id.toInt(),
                name = raw.name,
                fullName = raw.fullName,
                description = raw.description,
                url = raw.htmlUrl,
                language = raw.language,
                stars = raw.stargazersCount,
                topics = raw.topics.toTypedArray(),
                isPrivate = raw.private,
                syncedAt = Instant.now(),
            )
        }

        repoRepository.saveAll(saved)
        return mapOf("synced" to saved.size)
    }
}