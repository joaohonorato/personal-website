package com.joaohonorato.blog.model

import jakarta.persistence.*
import java.time.Instant

@Entity
@Table(name = "projects")
class Project(
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    val id: Int? = null,

    @Column(nullable = false)
    var name: String = "",

    @Column(nullable = false, columnDefinition = "TEXT")
    var description: String = "",

    @Column(name = "created_at", nullable = false)
    val createdAt: Instant = Instant.now(),

    @Column(name = "updated_at", nullable = false)
    var updatedAt: Instant = Instant.now(),

    @ManyToMany
    @JoinTable(
        name = "project_repos",
        joinColumns = [JoinColumn(name = "project_id")],
        inverseJoinColumns = [JoinColumn(name = "repo_id")],
    )
    var repos: MutableList<GithubRepo> = mutableListOf(),

    @ManyToMany
    @JoinTable(
        name = "post_projects",
        joinColumns = [JoinColumn(name = "project_id")],
        inverseJoinColumns = [JoinColumn(name = "post_id")],
    )
    var posts: MutableList<Post> = mutableListOf(),
)