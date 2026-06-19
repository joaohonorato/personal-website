package com.joaohonorato.blog.service

import com.joaohonorato.blog.repository.UserRepository
import org.springframework.security.authentication.BadCredentialsException
import org.springframework.security.crypto.password.PasswordEncoder
import org.springframework.stereotype.Service

@Service
class AuthService(
    private val userRepo: UserRepository,
    private val passwordEncoder: PasswordEncoder,
    private val jwtService: JwtService,
) {
    fun login(email: String, password: String): Pair<String, List<String>> {
        val user = userRepo.findByEmail(email)
            .filter { passwordEncoder.matches(password, it.passwordHash) }
            .orElseThrow { BadCredentialsException("Invalid credentials") }
        return Pair(jwtService.generate(user), user.roles.map { it.name })
    }
}