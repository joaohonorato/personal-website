package com.joaohonorato.blog.service

import com.joaohonorato.blog.model.User
import com.joaohonorato.blog.model.UserRole
import com.joaohonorato.blog.repository.UserRepository
import io.mockk.every
import io.mockk.mockk
import org.junit.jupiter.api.assertThrows
import org.springframework.security.authentication.BadCredentialsException
import org.springframework.security.crypto.password.PasswordEncoder
import java.time.Instant
import java.util.Optional
import kotlin.test.Test
import kotlin.test.assertEquals

class AuthServiceTest {

    private val userRepo = mockk<UserRepository>()
    private val passwordEncoder = mockk<PasswordEncoder>()
    private val jwtService = mockk<JwtService>()

    private val service = AuthService(userRepo, passwordEncoder, jwtService)

    private val user = User(
        id = 1,
        email = "admin@example.com",
        passwordHash = "hashed",
        role = UserRole.ADMIN,
        createdAt = Instant.now(),
    )

    @Test
    fun `login returns token and role on valid credentials`() {
        every { userRepo.findByEmail("admin@example.com") } returns Optional.of(user)
        every { passwordEncoder.matches("secret", "hashed") } returns true
        every { jwtService.generate(user) } returns "jwt-token"

        val (token, role) = service.login("admin@example.com", "secret")

        assertEquals("jwt-token", token)
        assertEquals("ADMIN", role)
    }

    @Test
    fun `login throws BadCredentialsException when email not found`() {
        every { userRepo.findByEmail("unknown@example.com") } returns Optional.empty()

        assertThrows<BadCredentialsException> {
            service.login("unknown@example.com", "any")
        }
    }

    @Test
    fun `login throws BadCredentialsException when password is wrong`() {
        every { userRepo.findByEmail("admin@example.com") } returns Optional.of(user)
        every { passwordEncoder.matches("wrong", "hashed") } returns false

        assertThrows<BadCredentialsException> {
            service.login("admin@example.com", "wrong")
        }
    }
}