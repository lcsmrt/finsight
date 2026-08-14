package com.lcs.finsight.support;

import java.sql.Connection;
import java.util.List;
import java.util.Set;
import javax.sql.DataSource;
import org.junit.jupiter.api.BeforeEach;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.context.SpringBootTest.WebEnvironment;
import org.springframework.context.annotation.Import;
import org.springframework.jdbc.core.ConnectionCallback;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

@SpringBootTest(webEnvironment = WebEnvironment.MOCK)
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Import({TestAuthHelper.class, Fixtures.class})
public abstract class AbstractIntegrationTest {

    /**
     * Databases this suite is allowed to wipe. The datasource comes from
     * {@code backend/.env}, which sits next to {@code .env.production} and points at a
     * Postgres instance that also hosts the production database — so the target of
     * {@link #truncateAll()} is only ever as safe as that one file. Anything not listed
     * here fails the run instead of losing data.
     */
    private static final Set<String> DISPOSABLE_DATABASES = Set.of("dev_finsight");

    @Autowired
    protected MockMvc mockMvc;

    @Autowired
    protected TestAuthHelper testAuthHelper;

    @Autowired
    protected Fixtures fixtures;

    @Autowired
    private DataSource dataSource;

    @BeforeEach
    void truncateAll() {
        JdbcTemplate jdbcTemplate = new JdbcTemplate(dataSource);
        assertDatabaseIsDisposable(jdbcTemplate);

        List<String> tables = jdbcTemplate.queryForList(
                "SELECT table_name FROM information_schema.tables "
                        + "WHERE table_schema = 'public' AND table_name <> 'flyway_schema_history'",
                String.class);
        if (tables.isEmpty()) {
            return;
        }
        jdbcTemplate.execute("TRUNCATE TABLE " + String.join(", ", tables) + " RESTART IDENTITY CASCADE");
    }

    private static void assertDatabaseIsDisposable(JdbcTemplate jdbcTemplate) {
        String database = jdbcTemplate.execute((ConnectionCallback<String>) Connection::getCatalog);
        if (!DISPOSABLE_DATABASES.contains(database)) {
            throw new IllegalStateException(
                    "Refusing to run integration tests against database '" + database + "'. Every test "
                            + "truncates every table, and only " + DISPOSABLE_DATABASES + " may be wiped. "
                            + "Check SPRING_DATASOURCE_URL in backend/.env.");
        }
    }
}
