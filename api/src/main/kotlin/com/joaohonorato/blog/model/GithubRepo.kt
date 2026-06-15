package com.joaohonorato.blog.model

import jakarta.persistence.*
import org.hibernate.annotations.JdbcTypeCode
import org.hibernate.type.SqlTypes
import java.time.Instant

@Entity
@Table(name = "github_repos")
class GithubRepo(
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    val id: Int? = null,

    @Column(name = "github_id", unique = true, nullable = false)
    val githubId: Int = 0,

    @Column(nullable = false)
    val name: String = "",

    @Column(name = "full_name", nullable = false)
    val fullName: String = "",

    val description: String? = null,

    @Column(nullable = false)
    val url: String = "",

    val language: String? = null,

    @Column(nullable = false)
    val stars: Int = 0,

    @JdbcTypeCode(SqlTypes.ARRAY)
    @Column(columnDefinition = "text[]")
    val topics: Array<String> = emptyArray(),

    @Column(name = "is_private", nullable = false)
    val isPrivate: Boolean = false,

    @Column(name = "synced_at", nullable = false)
    val syncedAt: Instant = Instant.now(),
)