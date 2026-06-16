package com.joaohonorato.blog.controller

import com.joaohonorato.blog.model.User
import com.joaohonorato.blog.model.UserRole
import com.joaohonorato.blog.repository.UserRepository
import jakarta.validation.Valid
import jakarta.validation.constraints.Email
import jakarta.validation.constraints.NotBlank
import org.springframework.http.ResponseEntity
import org.springframework.security.access.prepost.PreAuthorize
import org.springframework.security.core.annotation.AuthenticationPrincipal
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder
import org.springframework.web.bind.annotation.*
import java.time.Instant

@RestController
@RequestMapping("/api/users")
@PreAuthorize("hasRole('ADMIN')")
class UserController(
    private val userRepo: UserRepository,
    private val passwordEncoder: BCryptPasswordEncoder,
) {

    @GetMapping
    fun listAll() = userRepo.findAll().map { it.toResponse() }

    @GetMapping("/{id}")
    fun getById(@PathVariable id: Int): ResponseEntity<UserResponse> =
        userRepo.findById(id)
            .map { ResponseEntity.ok(it.toResponse()) }
            .orElse(ResponseEntity.notFound().build())

    @PostMapping
    fun create(@Valid @RequestBody body: CreateUserRequest): ResponseEntity<UserResponse> {
        if (userRepo.findByEmail(body.email).isPresent) {
            return ResponseEntity.status(409).build()
        }
        val user = User(
            email = body.email,
            passwordHash = passwordEncoder.encode(body.password)!!,
            role = body.role,
        )
        return ResponseEntity.status(201).body(userRepo.save(user).toResponse())
    }

    @PutMapping("/{id}")
    fun update(
        @PathVariable id: Int,
        @Valid @RequestBody body: UpdateUserRequest,
        @AuthenticationPrincipal currentUserId: String,
    ): ResponseEntity<UserResponse> {
        val user = userRepo.findById(id).orElse(null) ?: return ResponseEntity.notFound().build()
        body.email?.let { user.email = it }
        body.password?.let { user.passwordHash = passwordEncoder.encode(it)!! }
        body.role?.let {
            if (user.id.toString() == currentUserId) return ResponseEntity.status(400).build()
            user.role = it
        }
        return ResponseEntity.ok(userRepo.save(user).toResponse())
    }

    @DeleteMapping("/{id}")
    fun delete(
        @PathVariable id: Int,
        @AuthenticationPrincipal currentUserId: String,
    ): ResponseEntity<Void> {
        if (id.toString() == currentUserId) return ResponseEntity.status(400).build()
        if (!userRepo.existsById(id)) return ResponseEntity.notFound().build()
        userRepo.deleteById(id)
        return ResponseEntity.noContent().build()
    }
}

private fun User.toResponse() = UserResponse(
    id = id!!,
    email = email,
    role = role,
    createdAt = createdAt,
)

data class UserResponse(
    val id: Int,
    val email: String,
    val role: UserRole,
    val createdAt: Instant,
)

data class CreateUserRequest(
    @field:Email @field:NotBlank val email: String,
    @field:NotBlank val password: String,
    val role: UserRole = UserRole.READER,
)

data class UpdateUserRequest(
    @field:Email val email: String? = null,
    val password: String? = null,
    val role: UserRole? = null,
)