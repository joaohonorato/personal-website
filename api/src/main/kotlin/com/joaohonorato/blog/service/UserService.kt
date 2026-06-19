package com.joaohonorato.blog.service

import com.joaohonorato.blog.exception.BadRequestException
import com.joaohonorato.blog.exception.ConflictException
import com.joaohonorato.blog.exception.ResourceNotFoundException
import com.joaohonorato.blog.model.User
import com.joaohonorato.blog.model.UserRole
import com.joaohonorato.blog.repository.UserRepository
import org.springframework.security.crypto.password.PasswordEncoder
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.time.Instant

@Service
class UserService(
    private val userRepo: UserRepository,
    private val passwordEncoder: PasswordEncoder,
) {
    @Transactional(readOnly = true)
    fun listAll(): List<UserResponse> = userRepo.findAll().map { it.toResponse() }

    @Transactional(readOnly = true)
    fun getById(id: Int): UserResponse =
        userRepo.findById(id).map { it.toResponse() }
            .orElseThrow { ResourceNotFoundException("User", id) }

    @Transactional
    fun create(request: CreateUserRequest): UserResponse {
        if (userRepo.findByEmail(request.email).isPresent)
            throw ConflictException("Email '${request.email}' already in use")
        val user = User(
            email = request.email,
            passwordHash = passwordEncoder.encode(request.password)!!,
            roles = request.roles.toMutableSet(),
        )
        return userRepo.save(user).toResponse()
    }

    @Transactional
    fun update(id: Int, request: UpdateUserRequest, currentUserId: String): UserResponse {
        val user = userRepo.findById(id).orElseThrow { ResourceNotFoundException("User", id) }
        request.email?.let { newEmail ->
            if (newEmail != user.email && userRepo.findByEmail(newEmail).isPresent)
                throw ConflictException("Email '$newEmail' already in use")
            user.email = newEmail
        }
        request.password?.let { user.passwordHash = passwordEncoder.encode(it)!! }
        request.roles?.let {
            if (user.id.toString() != currentUserId) user.roles = it.toMutableSet()
        }
        return userRepo.save(user).toResponse()
    }

    @Transactional
    fun delete(id: Int, currentUserId: String) {
        if (id.toString() == currentUserId) throw BadRequestException("Cannot delete yourself")
        if (!userRepo.existsById(id)) throw ResourceNotFoundException("User", id)
        userRepo.deleteById(id)
    }
}

data class UserResponse(
    val id: Int,
    val email: String,
    val roles: Set<UserRole>,
    val createdAt: Instant,
)

data class CreateUserRequest(
    val email: String,
    val password: String,
    val roles: Set<UserRole> = setOf(UserRole.READER),
)

data class UpdateUserRequest(
    val email: String? = null,
    val password: String? = null,
    val roles: Set<UserRole>? = null,
)

private fun User.toResponse() = UserResponse(
    id = id!!,
    email = email,
    roles = roles,
    createdAt = createdAt,
)
