package com.joaohonorato.blog.controller

import com.joaohonorato.blog.repository.UserRepository
import io.jsonwebtoken.Jwts
import io.jsonwebtoken.security.Keys
import jakarta.validation.Valid
import jakarta.validation.constraints.Email
import jakarta.validation.constraints.NotBlank
import org.springframework.beans.factory.annotation.Value
import org.springframework.http.ResponseEntity
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder
import org.springframework.web.bind.annotation.*
import java.util.Date

@RestController
@RequestMapping("/api/auth")
class AuthController(
    private val userRepo: UserRepository,
    private val passwordEncoder: BCryptPasswordEncoder,
    @Value("\${app.jwt-secret}") private val jwtSecret: String,
) {

    @PostMapping("/login")
    fun login(@Valid @RequestBody body: LoginRequest): ResponseEntity<Map<String, String>> {
        val user = userRepo.findByEmail(body.email).orElse(null)
            ?: return ResponseEntity.status(401).body(mapOf("error" to "Invalid credentials"))

        if (!passwordEncoder.matches(body.password, user.passwordHash)) {
            return ResponseEntity.status(401).body(mapOf("error" to "Invalid credentials"))
        }

        val key = Keys.hmacShaKeyFor(jwtSecret.toByteArray(Charsets.UTF_8))
        val token = Jwts.builder()
            .subject(user.id.toString())
            .claim("email", user.email)
            .claim("role", user.role.name)
            .issuedAt(Date())
            .expiration(Date(System.currentTimeMillis() + 30L * 24 * 60 * 60 * 1000))
            .signWith(key)
            .compact()

        return ResponseEntity.ok(mapOf("token" to token, "role" to user.role.name))
    }
}

data class LoginRequest(
    @field:Email @field:NotBlank val email: String,
    @field:NotBlank val password: String,
)