package com.joaohonorato.auth.service

import com.joaohonorato.auth.repository.UserRepository
import org.springframework.security.core.authority.SimpleGrantedAuthority
import org.springframework.security.core.userdetails.User
import org.springframework.security.core.userdetails.UserDetails
import org.springframework.security.core.userdetails.UserDetailsService
import org.springframework.security.core.userdetails.UsernameNotFoundException
import org.springframework.stereotype.Service

@Service
class UserDetailsServiceImpl(private val userRepository: UserRepository) : UserDetailsService {

    override fun loadUserByUsername(username: String): UserDetails {
        val user = userRepository.findByEmail(username)
            .orElseThrow { UsernameNotFoundException("User not found: $username") }

        val authorities = user.roles.map { SimpleGrantedAuthority("ROLE_${it.name}") }

        return User.builder()
            .username(user.email)
            .password(user.passwordHash)
            .authorities(authorities)
            .build()
    }
}
