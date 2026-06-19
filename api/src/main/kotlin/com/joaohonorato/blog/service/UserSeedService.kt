package com.joaohonorato.blog.service

import com.joaohonorato.blog.model.User
import com.joaohonorato.blog.model.UserRole
import com.joaohonorato.blog.repository.UserRepository
import org.slf4j.LoggerFactory
import org.springframework.beans.factory.annotation.Value
import org.springframework.boot.ApplicationArguments
import org.springframework.boot.ApplicationRunner
import org.springframework.security.crypto.password.PasswordEncoder
import org.springframework.stereotype.Component

@Component
class UserSeedService(
    private val userRepo: UserRepository,
    private val passwordEncoder: PasswordEncoder,
    @Value("\${app.admin.email:}") private val adminEmail: String?,
    @Value("\${app.admin.password:}") private val adminPassword: String?,
) : ApplicationRunner {

    private val logger = LoggerFactory.getLogger(UserSeedService::class.java)

    override fun run(args: ApplicationArguments) {
        if (userRepo.count() > 0) return

        val email = adminEmail.takeUnless { it.isNullOrBlank() } ?: run {
            logger.warn("No users in DB — set ADMIN_EMAIL and ADMIN_PASSWORD env vars to seed the first admin")
            return
        }
        val password = adminPassword.takeUnless { it.isNullOrBlank() } ?: run {
            logger.warn("ADMIN_PASSWORD not set — skipping admin user creation")
            return
        }

        userRepo.save(User(email = email, passwordHash = passwordEncoder.encode(password)!!, roles = mutableSetOf(UserRole.ADMIN)))
        logger.info("Created initial admin user: $email")
    }
}