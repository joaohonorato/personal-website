package com.joaohonorato.blog.service

import com.joaohonorato.blog.model.User
import com.joaohonorato.blog.model.UserRole
import io.jsonwebtoken.security.SignatureException
import org.junit.jupiter.api.assertThrows
import java.time.Instant
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertNotNull

class JwtServiceTest {

    private val secret = "test-secret-key-must-be-at-least-32-bytes-long-for-hmac"
    private val service = JwtService(secret, expirationDays = 30)

    private val user = User(
        id = 42,
        email = "test@example.com",
        passwordHash = "hash",
        role = UserRole.WRITER,
        createdAt = Instant.now(),
    )

    @Test
    fun `generate returns non-blank token`() {
        val token = service.generate(user)
        assertNotNull(token)
        assert(token.isNotBlank())
    }

    @Test
    fun `parseClaims extracts correct subject`() {
        val token = service.generate(user)
        val claims = service.parseClaims(token)
        assertEquals("42", claims.subject)
    }

    @Test
    fun `parseClaims extracts correct email claim`() {
        val token = service.generate(user)
        val claims = service.parseClaims(token)
        assertEquals("test@example.com", claims["email"])
    }

    @Test
    fun `parseClaims extracts correct role claim`() {
        val token = service.generate(user)
        val claims = service.parseClaims(token)
        assertEquals("WRITER", claims["role"])
    }

    @Test
    fun `parseClaims throws on tampered token`() {
        val token = service.generate(user)
        val tampered = token.dropLast(5) + "XXXXX"
        assertThrows<Exception> { service.parseClaims(tampered) }
    }

    @Test
    fun `parseClaims throws on token signed with different secret`() {
        val otherService = JwtService("another-secret-key-that-is-at-least-32-bytes-long!!", expirationDays = 30)
        val token = otherService.generate(user)
        assertThrows<SignatureException> { service.parseClaims(token) }
    }
}