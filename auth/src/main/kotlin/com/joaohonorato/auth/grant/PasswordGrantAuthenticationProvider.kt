package com.joaohonorato.auth.grant

import org.springframework.security.authentication.UsernamePasswordAuthenticationToken
import org.springframework.security.core.Authentication
import org.springframework.security.core.userdetails.UserDetails
import org.springframework.security.core.userdetails.UserDetailsService
import org.springframework.security.core.userdetails.UsernameNotFoundException
import org.springframework.security.crypto.password.PasswordEncoder
import org.springframework.security.oauth2.core.AuthorizationGrantType
import org.springframework.security.oauth2.core.OAuth2AccessToken
import org.springframework.security.oauth2.core.OAuth2AuthenticationException
import org.springframework.security.oauth2.core.OAuth2Error
import org.springframework.security.oauth2.core.OAuth2ErrorCodes
import org.springframework.security.oauth2.core.OAuth2RefreshToken
import org.springframework.security.oauth2.core.OAuth2Token
import org.springframework.security.oauth2.server.authorization.OAuth2Authorization
import org.springframework.security.oauth2.server.authorization.OAuth2AuthorizationService
import org.springframework.security.oauth2.server.authorization.OAuth2TokenType
import org.springframework.security.oauth2.server.authorization.authentication.OAuth2AccessTokenAuthenticationToken
import org.springframework.security.oauth2.server.authorization.authentication.OAuth2ClientAuthenticationToken
import org.springframework.security.oauth2.server.authorization.context.AuthorizationServerContextHolder
import org.springframework.security.oauth2.server.authorization.token.DefaultOAuth2TokenContext
import org.springframework.security.oauth2.server.authorization.token.OAuth2TokenGenerator

class PasswordGrantAuthenticationProvider(
    private val userDetailsService: UserDetailsService,
    private val passwordEncoder: PasswordEncoder,
    private val authorizationService: OAuth2AuthorizationService,
    private val tokenGenerator: OAuth2TokenGenerator<out OAuth2Token>,
) : org.springframework.security.authentication.AuthenticationProvider {

    override fun authenticate(authentication: Authentication): Authentication {
        val grantAuth = authentication as PasswordGrantAuthenticationToken

        // 1. Validate client
        val clientPrincipal = grantAuth.principal as? OAuth2ClientAuthenticationToken
            ?: throw OAuth2AuthenticationException(OAuth2ErrorCodes.INVALID_CLIENT)
        if (!clientPrincipal.isAuthenticated) throw OAuth2AuthenticationException(OAuth2ErrorCodes.INVALID_CLIENT)
        val registeredClient = clientPrincipal.registeredClient!!

        if (!registeredClient.authorizationGrantTypes.contains(AuthorizationGrantType("password"))) {
            throw OAuth2AuthenticationException(OAuth2ErrorCodes.UNAUTHORIZED_CLIENT)
        }

        // 2. Validate user credentials
        val userDetails: UserDetails = try {
            userDetailsService.loadUserByUsername(grantAuth.username)
        } catch (e: UsernameNotFoundException) {
            throw OAuth2AuthenticationException(
                OAuth2Error(OAuth2ErrorCodes.INVALID_GRANT, "Invalid credentials", null)
            )
        }

        if (!passwordEncoder.matches(grantAuth.password, userDetails.password)) {
            throw OAuth2AuthenticationException(
                OAuth2Error(OAuth2ErrorCodes.INVALID_GRANT, "Invalid credentials", null)
            )
        }

        // 3. Build principal for token context
        val userPrincipal = UsernamePasswordAuthenticationToken(userDetails, null, userDetails.authorities)

        val baseContext = DefaultOAuth2TokenContext.builder()
            .registeredClient(registeredClient)
            .principal(userPrincipal)
            .authorizationServerContext(AuthorizationServerContextHolder.getContext())
            .authorizationGrantType(AuthorizationGrantType("password"))
            .authorizationGrant(grantAuth)

        // 4. Generate access token
        val accessTokenContext = baseContext.tokenType(OAuth2TokenType.ACCESS_TOKEN).build()
        val generatedToken = tokenGenerator.generate(accessTokenContext)
            ?: throw OAuth2AuthenticationException(
                OAuth2Error(OAuth2ErrorCodes.SERVER_ERROR, "Token generation failed", null)
            )

        val accessToken = OAuth2AccessToken(
            OAuth2AccessToken.TokenType.BEARER,
            generatedToken.tokenValue,
            generatedToken.issuedAt,
            generatedToken.expiresAt,
            registeredClient.scopes,
        )

        // 5. Generate refresh token (if client supports it)
        val refreshToken: OAuth2RefreshToken? =
            if (registeredClient.authorizationGrantTypes.contains(AuthorizationGrantType.REFRESH_TOKEN)) {
                val refreshContext = baseContext.tokenType(OAuth2TokenType.REFRESH_TOKEN).build()
                val generated = tokenGenerator.generate(refreshContext)
                generated?.let { OAuth2RefreshToken(it.tokenValue, it.issuedAt, it.expiresAt) }
            } else null

        // 6. Persist authorization record
        val authBuilder = OAuth2Authorization.withRegisteredClient(registeredClient)
            .principalName(userDetails.username)
            .authorizationGrantType(AuthorizationGrantType("password"))
            .authorizedScopes(registeredClient.scopes)

        if (generatedToken is org.springframework.security.oauth2.core.ClaimAccessor) {
            authBuilder.token(accessToken) { metadata ->
                metadata[OAuth2Authorization.Token.CLAIMS_METADATA_NAME] =
                    (generatedToken as org.springframework.security.oauth2.core.ClaimAccessor).claims
            }
        } else {
            authBuilder.token(accessToken)
        }

        if (refreshToken != null) {
            authBuilder.refreshToken(refreshToken)
        }

        authorizationService.save(authBuilder.build())

        return OAuth2AccessTokenAuthenticationToken(
            registeredClient,
            clientPrincipal,
            accessToken,
            refreshToken,
        )
    }

    override fun supports(authentication: Class<*>): Boolean =
        PasswordGrantAuthenticationToken::class.java.isAssignableFrom(authentication)
}
