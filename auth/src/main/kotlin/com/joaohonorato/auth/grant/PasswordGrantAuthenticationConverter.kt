package com.joaohonorato.auth.grant

import jakarta.servlet.http.HttpServletRequest
import org.springframework.security.core.Authentication
import org.springframework.security.core.context.SecurityContextHolder
import org.springframework.security.oauth2.core.OAuth2AuthenticationException
import org.springframework.security.oauth2.core.OAuth2Error
import org.springframework.security.oauth2.core.OAuth2ErrorCodes
import org.springframework.security.oauth2.core.endpoint.OAuth2ParameterNames
import org.springframework.security.web.authentication.AuthenticationConverter

class PasswordGrantAuthenticationConverter : AuthenticationConverter {

    override fun convert(request: HttpServletRequest): Authentication? {
        val grantType = request.getParameter(OAuth2ParameterNames.GRANT_TYPE)
        if (grantType != "password") return null

        val clientPrincipal = SecurityContextHolder.getContext().authentication
            ?: throw OAuth2AuthenticationException(
                OAuth2Error(OAuth2ErrorCodes.INVALID_CLIENT, "Client not authenticated", null)
            )

        // OAuth2ParameterNames.USERNAME/PASSWORD were removed in Spring Security 7 (ROPC is OAuth 2.0 only)
        val username = request.getParameter("username")
            ?: throw OAuth2AuthenticationException(
                OAuth2Error(OAuth2ErrorCodes.INVALID_REQUEST, "username is required", null)
            )
        val password = request.getParameter("password")
            ?: throw OAuth2AuthenticationException(
                OAuth2Error(OAuth2ErrorCodes.INVALID_REQUEST, "password is required", null)
            )

        val additionalParameters = request.parameterMap
            .filterKeys { it !in setOf("grant_type", "username", "password", "scope", "client_id", "client_secret") }
            .mapValues { it.value.first() }

        return PasswordGrantAuthenticationToken(username, password, clientPrincipal, additionalParameters)
    }
}
