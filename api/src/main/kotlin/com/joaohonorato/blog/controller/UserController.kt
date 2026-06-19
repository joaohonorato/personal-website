package com.joaohonorato.blog.controller

import com.joaohonorato.blog.model.UserRole
import com.joaohonorato.blog.service.CreateUserRequest
import com.joaohonorato.blog.service.UpdateUserRequest
import com.joaohonorato.blog.service.UserResponse
import com.joaohonorato.blog.service.UserService
import jakarta.validation.Valid
import jakarta.validation.constraints.Email
import jakarta.validation.constraints.NotBlank
import org.springframework.http.ResponseEntity
import org.springframework.security.access.prepost.PreAuthorize
import org.springframework.security.core.annotation.AuthenticationPrincipal
import org.springframework.web.bind.annotation.*

@RestController
@RequestMapping("/api/users")
@PreAuthorize("hasRole('ADMIN')")
class UserController(private val userService: UserService) {

    @GetMapping
    fun listAll(): List<UserResponse> = userService.listAll()

    @GetMapping("/{id}")
    fun getById(@PathVariable id: Int): UserResponse = userService.getById(id)

    @PostMapping
    fun create(@Valid @RequestBody body: CreateUserRequestDto): ResponseEntity<UserResponse> =
        ResponseEntity.status(201).body(userService.create(body.toServiceRequest()))

    @PutMapping("/{id}")
    fun update(
        @PathVariable id: Int,
        @Valid @RequestBody body: UpdateUserRequestDto,
        @AuthenticationPrincipal currentUserId: String,
    ): UserResponse = userService.update(id, body.toServiceRequest(), currentUserId)

    @DeleteMapping("/{id}")
    fun delete(
        @PathVariable id: Int,
        @AuthenticationPrincipal currentUserId: String,
    ): ResponseEntity<Void> {
        userService.delete(id, currentUserId)
        return ResponseEntity.noContent().build()
    }
}

data class CreateUserRequestDto(
    @field:Email @field:NotBlank val email: String,
    @field:NotBlank val password: String,
    val roles: Set<UserRole> = setOf(UserRole.READER),
)

data class UpdateUserRequestDto(
    @field:Email val email: String? = null,
    val password: String? = null,
    val roles: Set<UserRole>? = null,
)

private fun CreateUserRequestDto.toServiceRequest() = CreateUserRequest(email, password, roles)
private fun UpdateUserRequestDto.toServiceRequest() = UpdateUserRequest(email, password, roles)