package com.joaohonorato.blog.service

import com.joaohonorato.blog.exception.BadRequestException
import com.joaohonorato.blog.exception.ConflictException
import com.joaohonorato.blog.exception.ResourceNotFoundException
import com.joaohonorato.blog.model.User
import com.joaohonorato.blog.model.UserRole
import com.joaohonorato.blog.repository.UserRepository
import io.mockk.every
import io.mockk.mockk
import io.mockk.verify
import org.springframework.security.crypto.password.PasswordEncoder
import java.time.Instant
import java.util.Optional
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFailsWith

class UserServiceTest {

    private val userRepo = mockk<UserRepository>()
    private val passwordEncoder = mockk<PasswordEncoder>()

    private val service = UserService(userRepo, passwordEncoder)

    private fun makeUser(
        id: Int = 1,
        email: String = "user@example.com",
        role: UserRole = UserRole.READER,
    ) = User(id = id, email = email, passwordHash = "hash", role = role, createdAt = Instant.now())

    // ── listAll ──────────────────────────────────────────────────────────────

    @Test
    fun `listAll returns all users mapped to response`() {
        every { userRepo.findAll() } returns listOf(makeUser(1), makeUser(2, "other@example.com"))

        val result = service.listAll()

        assertEquals(2, result.size)
        assertEquals("user@example.com", result[0].email)
    }

    // ── getById ──────────────────────────────────────────────────────────────

    @Test
    fun `getById returns user when found`() {
        val user = makeUser(id = 5, email = "found@example.com")
        every { userRepo.findById(5) } returns Optional.of(user)

        val result = service.getById(5)

        assertEquals(5, result.id)
        assertEquals("found@example.com", result.email)
    }

    @Test
    fun `getById throws ResourceNotFoundException when not found`() {
        every { userRepo.findById(99) } returns Optional.empty()

        assertFailsWith<ResourceNotFoundException> { service.getById(99) }
    }

    // ── create ───────────────────────────────────────────────────────────────

    @Test
    fun `create saves user with encoded password`() {
        every { userRepo.findByEmail("new@example.com") } returns Optional.empty()
        every { passwordEncoder.encode("pass") } returns "encoded"
        every { userRepo.save(any()) } answers {
            val u = firstArg<User>()
            User(id = 10, email = u.email, passwordHash = u.passwordHash, role = u.role)
        }

        val result = service.create(CreateUserRequest("new@example.com", "pass", UserRole.WRITER))

        assertEquals("new@example.com", result.email)
        assertEquals(UserRole.WRITER, result.role)
        verify { passwordEncoder.encode("pass") }
    }

    @Test
    fun `create throws ConflictException when email already exists`() {
        every { userRepo.findByEmail("dup@example.com") } returns Optional.of(makeUser(email = "dup@example.com"))

        assertFailsWith<ConflictException> {
            service.create(CreateUserRequest("dup@example.com", "pass"))
        }
    }

    // ── update ───────────────────────────────────────────────────────────────

    @Test
    fun `update changes email when new email is free`() {
        val user = makeUser(id = 1, email = "old@example.com")
        every { userRepo.findById(1) } returns Optional.of(user)
        every { userRepo.findByEmail("new@example.com") } returns Optional.empty()
        every { userRepo.save(any()) } answers { firstArg() }

        val result = service.update(1, UpdateUserRequest(email = "new@example.com"), currentUserId = "99")

        assertEquals("new@example.com", result.email)
    }

    @Test
    fun `update throws ConflictException when new email belongs to another user`() {
        val user = makeUser(id = 1, email = "old@example.com")
        every { userRepo.findById(1) } returns Optional.of(user)
        every { userRepo.findByEmail("taken@example.com") } returns Optional.of(makeUser(id = 2, email = "taken@example.com"))

        assertFailsWith<ConflictException> {
            service.update(1, UpdateUserRequest(email = "taken@example.com"), currentUserId = "99")
        }
    }

    @Test
    fun `update allows keeping own email without conflict`() {
        val user = makeUser(id = 1, email = "same@example.com")
        every { userRepo.findById(1) } returns Optional.of(user)
        every { userRepo.save(any()) } answers { firstArg() }

        // No findByEmail call expected when email is unchanged
        val result = service.update(1, UpdateUserRequest(email = "same@example.com"), currentUserId = "99")

        assertEquals("same@example.com", result.email)
    }

    @Test
    fun `update throws BadRequestException when changing own role`() {
        val user = makeUser(id = 1, role = UserRole.ADMIN)
        every { userRepo.findById(1) } returns Optional.of(user)

        assertFailsWith<BadRequestException> {
            service.update(1, UpdateUserRequest(role = UserRole.READER), currentUserId = "1")
        }
    }

    @Test
    fun `update changes role when not changing own`() {
        val user = makeUser(id = 2, role = UserRole.READER)
        every { userRepo.findById(2) } returns Optional.of(user)
        every { userRepo.save(any()) } answers { firstArg() }

        val result = service.update(2, UpdateUserRequest(role = UserRole.WRITER), currentUserId = "1")

        assertEquals(UserRole.WRITER, result.role)
    }

    @Test
    fun `update throws ResourceNotFoundException when user not found`() {
        every { userRepo.findById(99) } returns Optional.empty()

        assertFailsWith<ResourceNotFoundException> {
            service.update(99, UpdateUserRequest(email = "x@x.com"), currentUserId = "1")
        }
    }

    // ── delete ───────────────────────────────────────────────────────────────

    @Test
    fun `delete removes user when found and not self`() {
        every { userRepo.existsById(2) } returns true
        every { userRepo.deleteById(2) } returns Unit

        service.delete(2, currentUserId = "1")

        verify { userRepo.deleteById(2) }
    }

    @Test
    fun `delete throws BadRequestException when deleting self`() {
        assertFailsWith<BadRequestException> {
            service.delete(1, currentUserId = "1")
        }
    }

    @Test
    fun `delete throws ResourceNotFoundException when user not found`() {
        every { userRepo.existsById(99) } returns false

        assertFailsWith<ResourceNotFoundException> {
            service.delete(99, currentUserId = "1")
        }
    }
}