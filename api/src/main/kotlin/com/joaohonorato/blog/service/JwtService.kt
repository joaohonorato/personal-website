package com.joaohonorato.blog.service

import com.joaohonorato.blog.model.User
import io.jsonwebtoken.Claims
import io.jsonwebtoken.Jwts
import io.jsonwebtoken.security.Keys
import org.springframework.beans.factory.annotation.Value
import org.springframework.stereotype.Component
import java.util.Date
import javax.crypto.SecretKey

@Component
class JwtService(
    @Value("\${app.jwt-secret}") secret: String,
    @Value("\${app.jwt-expiration-days:30}") private val expirationDays: Long,
) {
    private val key: SecretKey = Keys.hmacShaKeyFor(secret.toByteArray(Charsets.UTF_8))

    fun generate(user: User): String = Jwts.builder()
        .subject(user.id.toString())
        .claim("email", user.email)
        .claim("role", user.role.name)
        .issuedAt(Date())
        .expiration(Date(System.currentTimeMillis() + expirationDays * 24 * 60 * 60 * 1000))
        .signWith(key)
        .compact()

    fun parseClaims(token: String): Claims =
        Jwts.parser().verifyWith(key).build().parseSignedClaims(token).payload
}