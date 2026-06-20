package com.joaohonorato.auth.config

import com.joaohonorato.auth.model.User
import com.joaohonorato.auth.model.UserRole
import com.joaohonorato.auth.repository.UserRepository
import jakarta.annotation.PostConstruct
import org.springframework.beans.factory.annotation.Value
import org.springframework.security.crypto.password.PasswordEncoder
import org.springframework.stereotype.Component

@Component
class AdminUserInitializer(
    private val userRepository: UserRepository,
    private val passwordEncoder: PasswordEncoder,
    @Value("\${app.admin.email:}") private val adminEmail: String,
    @Value("\${app.admin.password:}") private val adminPassword: String,
) {
    @PostConstruct
    fun init() {
        if (adminEmail.isBlank() || adminPassword.isBlank()) return
        if (userRepository.findByEmail(adminEmail).isPresent) return

        userRepository.save(
            User(
                email = adminEmail,
                passwordHash = passwordEncoder.encode(adminPassword) ?: return,
                roles = setOf(UserRole.ADMIN),
            )
        )
    }
}
