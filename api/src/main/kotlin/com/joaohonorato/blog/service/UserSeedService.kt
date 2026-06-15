package com.joaohonorato.blog.service

import com.joaohonorato.blog.model.User
import com.joaohonorato.blog.repository.UserRepository
import org.slf4j.LoggerFactory
import org.springframework.beans.factory.annotation.Value
import org.springframework.boot.ApplicationArguments
import org.springframework.boot.ApplicationRunner
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder
import org.springframework.stereotype.Component

@Component
class UserSeedService(
    private val userRepo: UserRepository,
    private val passwordEncoder: BCryptPasswordEncoder,
    @Value("\${app.admin.email:}") private val adminEmail: String?,
    @Value("\${app.admin.password:}") private val adminPassword: String?,
) : ApplicationRunner {

    private val logger = LoggerFactory.getLogger(UserSeedService::class.java)

    override fun run(args: ApplicationArguments) {
        if (userRepo.count() > 0) return
        if (adminEmail.isNullOrBlank() || adminPassword.isNullOrBlank()) {
            logger.warn("No users in DB — set ADMIN_EMAIL and ADMIN_PASSWORD env vars to create the first user")
            return
        }
        val hash = passwordEncoder.encode(adminPassword!!)!!
        userRepo.save(User(email = adminEmail!!, passwordHash = hash))
        logger.info("Created initial admin user: $adminEmail")
    }
}