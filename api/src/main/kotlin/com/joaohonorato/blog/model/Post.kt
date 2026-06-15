package com.joaohonorato.blog.model

import jakarta.persistence.*
import org.hibernate.annotations.JdbcTypeCode
import org.hibernate.type.SqlTypes
import java.time.Instant

@Entity
@Table(name = "posts")
class Post(
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    val id: Int? = null,

    @Column(unique = true, nullable = false)
    var slug: String = "",

    @Column(nullable = false)
    var title: String = "",

    @Column(nullable = false)
    var excerpt: String = "",

    @Column(nullable = false, columnDefinition = "TEXT")
    var content: String = "",

    @Column(nullable = false)
    var category: String = "",

    @JdbcTypeCode(SqlTypes.ARRAY)
    @Column(columnDefinition = "text[]")
    var tags: Array<String> = emptyArray(),

    @Column(nullable = false)
    var published: Boolean = false,

    @Column(name = "generated_by_agent", nullable = false)
    var generatedByAgent: Boolean = false,

    @Column(name = "reading_time_min", nullable = false)
    var readingTimeMin: Int = 1,

    @Column(name = "created_at", nullable = false)
    val createdAt: Instant = Instant.now(),

    @Column(name = "updated_at", nullable = false)
    var updatedAt: Instant = Instant.now(),
)