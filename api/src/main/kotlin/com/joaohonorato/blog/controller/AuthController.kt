package com.joaohonorato.blog.controller

import com.joaohonorato.blog.service.AuthService
import jakarta.validation.Valid
import jakarta.validation.constraints.Email
import jakarta.validation.constraints.NotBlank
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.*

@RestController
@RequestMapping("/api/auth")
class AuthController(private val authService: AuthService) {

    @PostMapping("/login")
    fun login(@Valid @RequestBody body: LoginRequest): ResponseEntity<Map<String, Any>> {
        val (token, roles) = authService.login(body.email, body.password)
        return ResponseEntity.ok(mapOf("token" to token, "roles" to roles))
    }
}

data class LoginRequest(
    @field:Email @field:NotBlank val email: String,
    @field:NotBlank val password: String,
)