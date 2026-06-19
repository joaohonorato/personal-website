package com.joaohonorato.blog.service

import org.slf4j.LoggerFactory
import org.springframework.boot.ApplicationArguments
import org.springframework.boot.ApplicationRunner
import org.springframework.core.annotation.Order
import org.springframework.jdbc.core.JdbcTemplate
import org.springframework.stereotype.Component

@Component
@Order(1)
class RoleMigrationRunner(private val jdbc: JdbcTemplate) : ApplicationRunner {

    private val log = LoggerFactory.getLogger(javaClass)

    override fun run(args: ApplicationArguments) {
        try {
            val migrated = jdbc.update("""
                INSERT INTO user_roles (user_id, role)
                SELECT u.id, u.role
                FROM users u
                WHERE u.role IS NOT NULL
                  AND NOT EXISTS (
                      SELECT 1 FROM user_roles ur WHERE ur.user_id = u.id
                  )
            """.trimIndent())
            if (migrated > 0) log.info("Migrated $migrated user(s) from single role to multi-role schema")
        } catch (e: Exception) {
            log.debug("Role migration skipped (new install or already migrated): ${e.message}")
        }
    }
}
