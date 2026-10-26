package com.example.todoapp.api;

import java.time.Duration;
import java.util.Map;
import java.util.Optional;

import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;

@Component
public class HolidayClient {
    private final RestClient restClient;

    public HolidayClient() {
        SimpleClientHttpRequestFactory requestFactory = new SimpleClientHttpRequestFactory();
        requestFactory.setConnectTimeout(Duration.ofSeconds(3));
        requestFactory.setReadTimeout(Duration.ofSeconds(5));
        this.restClient = RestClient.create().mutate()
                .requestFactory(requestFactory)
                .build();
    }

    public Optional<Map<String, String>> fetchHolidays() {
        try {
            Map<String, String> holidays = restClient.get()
                    .uri("https://holidays-jp.github.io//api/v1/date.json")
                    .retrieve()
                    .body(new ParameterizedTypeReference<Map<String, String>>() {
                    });
            return Optional.ofNullable(holidays);
        } catch (RestClientException exception) {
            return Optional.empty();
        }
    }
}
