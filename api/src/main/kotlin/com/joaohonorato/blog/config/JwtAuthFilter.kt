package com.joaohonorato.blog.config

import com.joaohonorato.blog.service.JwtService
import jakarta.servlet.FilterChain
import jakarta.servlet.http.HttpServletRequest
import jakarta.servlet.http.HttpServletResponse
import org.slf4j.LoggerFactory
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken
import org.springframework.security.core.authority.SimpleGrantedAuthority
import org.springframework.security.core.context.SecurityContextHolder
import org.springframework.stereotype.Component
import org.springframework.web.filter.OncePerRequestFilter

@Component
class JwtAuthFilter(private val jwtService: JwtService) : OncePerRequestFilter() {

    private val log = LoggerFactory.getLogger(JwtAuthFilter::class.java)

    override fun doFilterInternal(
        request: HttpServletRequest,
        response: HttpServletResponse,
        chain: FilterChain,
    ) {
        val header = request.getHeader("Authorization")
        if (header != null && header.startsWith("Bearer ")) {
            val token = header.removePrefix("Bearer ").trim()
            runCatching {
                val claims = jwtService.parseClaims(token)
                val role = claims["role"] as? String ?: "READER"
                SecurityContextHolder.getContext().authentication = UsernamePasswordAuthenticationToken(
                    claims.subject, null, listOf(SimpleGrantedAuthority("ROLE_$role"))
                )
            }.onFailure { log.warn("JWT inválido: ${it.message}") }
        }
        chain.doFilter(request, response)
    }
}