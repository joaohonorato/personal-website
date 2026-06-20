package com.joaohonorato.auth.config

import com.joaohonorato.auth.grant.PasswordGrantAuthenticationConverter
import com.joaohonorato.auth.grant.PasswordGrantAuthenticationProvider
import com.nimbusds.jose.jwk.source.JWKSource
import com.nimbusds.jose.proc.SecurityContext
import org.springframework.beans.factory.annotation.Value
import org.springframework.context.annotation.Bean
import org.springframework.context.annotation.Configuration
import org.springframework.core.annotation.Order
import org.springframework.security.core.userdetails.UserDetailsService
import org.springframework.security.crypto.password.PasswordEncoder
import org.springframework.security.oauth2.core.AuthorizationGrantType
import org.springframework.security.oauth2.core.ClientAuthenticationMethod
import org.springframework.security.oauth2.core.OAuth2Token
import org.springframework.security.oauth2.jwt.JwtDecoder
import org.springframework.security.oauth2.server.authorization.InMemoryOAuth2AuthorizationService
import org.springframework.security.oauth2.server.authorization.OAuth2AuthorizationService
import org.springframework.security.oauth2.server.authorization.OAuth2TokenType
import org.springframework.security.oauth2.server.authorization.client.InMemoryRegisteredClientRepository
import org.springframework.security.oauth2.server.authorization.client.RegisteredClient
import org.springframework.security.oauth2.server.authorization.client.RegisteredClientRepository
import org.springframework.security.oauth2.server.authorization.config.annotation.web.configuration.OAuth2AuthorizationServerConfiguration
import org.springframework.security.oauth2.server.authorization.config.annotation.web.configurers.OAuth2AuthorizationServerConfigurer
import org.springframework.security.oauth2.server.authorization.settings.AuthorizationServerSettings
import org.springframework.security.oauth2.server.authorization.settings.TokenSettings
import org.springframework.security.oauth2.server.authorization.token.OAuth2TokenCustomizer
import org.springframework.security.oauth2.server.authorization.token.OAuth2TokenGenerator
import org.springframework.security.oauth2.server.authorization.token.JwtEncodingContext
import org.springframework.security.web.SecurityFilterChain
import org.springframework.http.HttpMethod
import jakarta.servlet.http.HttpServletResponse
import org.springframework.security.config.annotation.web.builders.HttpSecurity
import java.time.Duration
import java.util.UUID

@Configuration
class AuthorizationServerConfig(
    private val userDetailsService: UserDetailsService,
    private val passwordEncoder: PasswordEncoder,
    @Value("\${app.client.frontend-secret}") private val frontendSecret: String,
    @Value("\${app.client.agent-secret}") private val agentSecret: String,
    @Value("\${app.jwt.expiration-days:30}") private val expirationDays: Long,
) {

    @Bean
    @Order(1)
    fun authorizationServerSecurityFilterChain(
        http: HttpSecurity,
        authorizationService: OAuth2AuthorizationService,
        tokenGenerator: OAuth2TokenGenerator<out OAuth2Token>,
    ): SecurityFilterChain {
        val configurer = OAuth2AuthorizationServerConfigurer()

        configurer.tokenEndpoint { tokenEndpoint ->
            tokenEndpoint.accessTokenRequestConverter(PasswordGrantAuthenticationConverter())
            tokenEndpoint.authenticationProvider(
                PasswordGrantAuthenticationProvider(
                    userDetailsService,
                    passwordEncoder,
                    authorizationService,
                    tokenGenerator,
                )
            )
        }

        http
            .securityMatcher(configurer.endpointsMatcher)
            .with(configurer) { }
            .authorizeHttpRequests { it.anyRequest().authenticated() }
            .csrf { it.ignoringRequestMatchers(configurer.endpointsMatcher) }
            .exceptionHandling { ex ->
                ex.authenticationEntryPoint { _, response, _ ->
                    response.sendError(HttpServletResponse.SC_UNAUTHORIZED)
                }
            }

        return http.build()
    }

    // ── Registered clients ────────────────────────────────────────────────────

    @Bean
    fun registeredClientRepository(): RegisteredClientRepository {
        // Next.js frontend: uses custom password grant
        val frontendClient = RegisteredClient.withId(UUID.randomUUID().toString())
            .clientId("blog-frontend")
            .clientSecret(passwordEncoder.encode(frontendSecret))
            .clientAuthenticationMethod(ClientAuthenticationMethod.CLIENT_SECRET_BASIC)
            .authorizationGrantType(AuthorizationGrantType("password"))
            .scope("read")
            .scope("write")
            .tokenSettings(
                TokenSettings.builder()
                    .accessTokenTimeToLive(Duration.ofDays(expirationDays))
                    .build()
            )
            .build()

        // Python agent: uses client_credentials (service-to-service)
        val agentClient = RegisteredClient.withId(UUID.randomUUID().toString())
            .clientId("blog-agent")
            .clientSecret(passwordEncoder.encode(agentSecret))
            .clientAuthenticationMethod(ClientAuthenticationMethod.CLIENT_SECRET_BASIC)
            .authorizationGrantType(AuthorizationGrantType.CLIENT_CREDENTIALS)
            .scope("agent")
            .tokenSettings(
                TokenSettings.builder()
                    .accessTokenTimeToLive(Duration.ofDays(1))
                    .build()
            )
            .build()

        return InMemoryRegisteredClientRepository(frontendClient, agentClient)
    }

    // ── Token customizer — injects roles + email into JWT ────────────────────

    @Bean
    fun tokenCustomizer(): OAuth2TokenCustomizer<JwtEncodingContext> =
        OAuth2TokenCustomizer { context ->
            if (context.tokenType == OAuth2TokenType.ACCESS_TOKEN) {
                val principal = context.getPrincipal<org.springframework.security.core.Authentication>()

                // password grant: principal is UserDetails
                val userDetails = principal.principal
                if (userDetails is org.springframework.security.core.userdetails.UserDetails) {
                    context.claims.apply {
                        claim("email", userDetails.username)
                        claim("roles", userDetails.authorities
                            .map { it.authority.removePrefix("ROLE_") })
                    }
                }

                // client_credentials: add scopes as roles for the agent
                if (principal.authorities.isEmpty()) {
                    context.claims.claim("roles", context.registeredClient.scopes.toList())
                }
            }
        }

    // ── Infrastructure beans ──────────────────────────────────────────────────

    @Bean
    fun authorizationService(): OAuth2AuthorizationService = InMemoryOAuth2AuthorizationService()

    @Bean
    fun jwtDecoder(jwkSource: JWKSource<SecurityContext>): JwtDecoder =
        OAuth2AuthorizationServerConfiguration.jwtDecoder(jwkSource)

    @Bean
    fun authorizationServerSettings(): AuthorizationServerSettings =
        AuthorizationServerSettings.builder().build()
}
