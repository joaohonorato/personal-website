package com.joaohonorato.blog.repository

import com.joaohonorato.blog.model.GithubRepo
import org.springframework.data.jpa.repository.JpaRepository
import java.util.Optional

interface GithubRepoRepository : JpaRepository<GithubRepo, Int> {
    fun findByGithubId(githubId: Long): Optional<GithubRepo>
}